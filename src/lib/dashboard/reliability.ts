import { db } from "@/lib/db";
import {
  researches, forms, responses as responsesTable,
  users, organizationMembers, researchReliabilityNotifications,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail } from "@/lib/email/resend";
import type { Research, Response as ResponseRow } from "@/lib/types";

// Valor da distribuição normal padrão pro nível de confiança escolhido —
// só esses três níveis são oferecidos na tela (90/95/99%), os mais usados
// em pesquisa de opinião e amostragem de censo.
const Z_SCORES: Record<number, number> = { 90: 1.645, 95: 1.96, 99: 2.576 };

export function zScoreForConfidence(confidenceLevel: number): number {
  return Z_SCORES[confidenceLevel] ?? Z_SCORES[95];
}

// Fórmula de Cochran com correção pra população finita. `expectedProportion`
// fica em 0,5 por padrão (pior caso/máxima variabilidade) — garante que a
// amostra calculada é suficiente não importa qual pergunta específica esteja
// sendo medida. Ver nota didática na tela de "Confiabilidade estatística".
export function calculateRequiredSampleSize(params: {
  universe?: number | null;
  confidenceLevel: number;
  marginError: number;
  expectedProportion?: number;
}): number {
  const p = params.expectedProportion ?? 0.5;
  const z = zScoreForConfidence(params.confidenceLevel);
  const e = params.marginError / 100;
  const zpq = z * z * p * (1 - p);

  if (!params.universe || params.universe <= 0) {
    return Math.ceil(zpq / (e * e));
  }
  const n = (params.universe * zpq) / (e * e * (params.universe - 1) + zpq);
  return Math.ceil(n);
}

export function groupResponseCountsByField(
  someResponses: Pick<ResponseRow, "data">[],
  fieldId: string,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of someResponses) {
    const raw = (r.data as Record<string, unknown> | null)?.[fieldId];
    if (typeof raw !== "string" || !raw.trim()) continue;
    counts[raw] = (counts[raw] ?? 0) + 1;
  }
  return counts;
}

export interface ReliabilityTarget {
  key: string | null; // null = meta geral (não estratificada)
  label: string;
  universe: number | null;
  required: number;
  current: number;
  met: boolean;
}

export interface ReliabilityResearcherProgress {
  userId: string;
  name: string;
  quota: number;
  current: number;
  met: boolean;
}

export interface ReliabilityStatus {
  configured: boolean;
  mode: "aggregate" | "stratified";
  confidenceLevel: number;
  marginError: number;
  overall: ReliabilityTarget;
  strata: ReliabilityTarget[];
  perResearcher: ReliabilityResearcherProgress[] | null;
}

type ReliabilityResearch = Pick<Research,
  "universeSize" | "confidenceLevel" | "marginError" | "reliabilityStratumFieldId" | "universeByStratum">;

export function computeReliabilityStatus(
  research: ReliabilityResearch,
  allResponses: Pick<ResponseRow, "data">[],
): Omit<ReliabilityStatus, "perResearcher"> {
  const confidenceLevel = research.confidenceLevel;
  const marginError = research.marginError;
  const totalCurrent = allResponses.length;
  const overallRequired = calculateRequiredSampleSize({ universe: research.universeSize, confidenceLevel, marginError });

  const overall: ReliabilityTarget = {
    key: null,
    label: "Geral",
    universe: research.universeSize ?? null,
    required: overallRequired,
    current: totalCurrent,
    met: totalCurrent >= overallRequired,
  };

  const universeByStratum = (research.universeByStratum as Record<string, number> | null) ?? null;
  const stratumFieldId = research.reliabilityStratumFieldId;

  let strata: ReliabilityTarget[] = [];
  let mode: "aggregate" | "stratified" = "aggregate";

  if (stratumFieldId && universeByStratum && Object.keys(universeByStratum).length > 0) {
    mode = "stratified";
    const counts = groupResponseCountsByField(allResponses, stratumFieldId);
    strata = Object.entries(universeByStratum).map(([key, universe]) => {
      const current = counts[key] ?? 0;
      const required = calculateRequiredSampleSize({ universe, confidenceLevel, marginError });
      return { key, label: key, universe, required, current, met: current >= required };
    });
  }

  return {
    configured: research.universeSize != null || mode === "stratified",
    mode,
    confidenceLevel,
    marginError,
    overall,
    strata,
  };
}

// Orquestra as queries e monta o status completo (inclui divisão por
// pesquisador quando a pesquisa pertence a uma organização).
export async function computeReliabilityStatusForResearch(researchId: string): Promise<ReliabilityStatus | null> {
  const research = await db.query.researches.findFirst({ where: eq(researches.id, researchId) });
  if (!research) return null;

  const form = await db.query.forms.findFirst({ where: eq(forms.researchId, researchId) });
  const allResponses = form
    ? await db.query.responses.findMany({ where: eq(responsesTable.formId, form.id) })
    : [];

  const base = computeReliabilityStatus(research, allResponses);

  let perResearcher: ReliabilityResearcherProgress[] | null = null;
  if (research.organizationId) {
    const members = await db.query.organizationMembers.findMany({
      where: eq(organizationMembers.organizationId, research.organizationId),
      with: { user: true },
    });
    if (members.length > 0) {
      const quota = Math.ceil(base.overall.required / members.length);
      const countsByUser: Record<string, number> = {};
      for (const r of allResponses) {
        if (!r.respondentId) continue;
        countsByUser[r.respondentId] = (countsByUser[r.respondentId] ?? 0) + 1;
      }
      perResearcher = members.map(m => ({
        userId: m.userId,
        name: m.user.name,
        quota,
        current: countsByUser[m.userId] ?? 0,
        met: (countsByUser[m.userId] ?? 0) >= quota,
      }));
    }
  }

  return { ...base, perResearcher };
}

// Chamada depois de salvar cada resposta nova — dispara e-mail pro dono da
// pesquisa nos alvos (geral ou por estrato) que acabaram de bater a meta e
// ainda não têm notificação registrada. Nunca lança erro: falha de e-mail
// não pode derrubar o envio de uma resposta.
export async function checkAndNotifyReliability(researchId: string): Promise<void> {
  try {
    const status = await computeReliabilityStatusForResearch(researchId);
    if (!status) return;

    const targets: ReliabilityTarget[] = [status.overall, ...status.strata].filter(t => t.met);
    if (targets.length === 0) return;

    const research = await db.query.researches.findFirst({ where: eq(researches.id, researchId) });
    if (!research) return;
    const owner = await db.query.users.findFirst({ where: eq(users.id, research.ownerId) });
    if (!owner) return;

    for (const target of targets) {
      const stratumKey = target.key;
      const already = await db.query.researchReliabilityNotifications.findFirst({
        where: (t, { and, eq: eqOp, isNull }) => stratumKey
          ? and(eqOp(t.researchId, researchId), eqOp(t.stratumKey, stratumKey))
          : and(eqOp(t.researchId, researchId), isNull(t.stratumKey)),
      });
      if (already) continue;

      await db.insert(researchReliabilityNotifications).values({ researchId, stratumKey });

      const scopeLabel = target.key ? `no estado/região ${target.label}` : "no total";
      await sendEmail({
        to: owner.email,
        subject: `Meta de confiabilidade estatística alcançada — ${research.title}`,
        html: `
          <p>Olá, ${owner.name}.</p>
          <p>A pesquisa <strong>${research.title}</strong> atingiu a meta de confiabilidade estatística ${scopeLabel}:
          ${target.current} de ${target.required} respostas necessárias
          (${status.confidenceLevel}% de confiança, margem de erro de ${status.marginError}%).</p>
          <p>— Dataº</p>
        `,
      });
    }
  } catch (err) {
    console.error("checkAndNotifyReliability falhou (ignorado):", err);
  }
}
