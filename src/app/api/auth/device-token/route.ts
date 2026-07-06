import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { deviceTokens } from "@/lib/db/schema";
import { hashDeviceToken } from "@/lib/auth/device";
import { apiSuccess, apiError } from "@/lib/utils";
import { z } from "zod";

const bodySchema = z.object({
  // Nome amigável do aparelho (ex.: "Moto G do Israel") — só pra listagem/revogação futura.
  label: z.string().max(200).optional(),
});

// Validade do token do app de campo. Longa de propósito: o aparelho pode
// passar semanas em campo sem internet — mas não infinita, pra limitar o
// estrago de um aparelho perdido (revogação manual vem numa fase futura).
const TOKEN_VALIDITY_DAYS = 180;

/**
 * Troca uma sessão NextAuth ativa (cookie — o app chama isso de dentro do
 * fluxo de login, ainda no contexto do navegador) por um token de dispositivo
 * de longa duração. O token em texto puro é devolvido UMA ÚNICA VEZ: só o
 * hash SHA-256 fica no banco, o servidor nunca mais consegue recuperá-lo.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  let label: string | undefined;
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);
    label = parsed.data.label;
  } catch {
    // Corpo vazio/ausente é aceitável — label é opcional.
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TOKEN_VALIDITY_DAYS * 24 * 60 * 60 * 1000);

  const [created] = await db.insert(deviceTokens).values({
    userId:    session.user.id,
    tokenHash: hashDeviceToken(token),
    label:     label ?? null,
    expiresAt,
  }).returning({ id: deviceTokens.id });

  return apiSuccess({
    // Guardar com segurança no aparelho (@capacitor/preferences) — não é
    // possível pedir esse valor de novo, só gerar um token novo.
    token,
    tokenId:   created.id,
    expiresAt: expiresAt.toISOString(),
  });
}
