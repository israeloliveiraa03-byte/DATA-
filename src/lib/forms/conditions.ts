// Lógica de exibição condicional dos instrumentos de coleta.
// Usada pela tela do respondente (/p/[slug]); o app de campo (mobile/) tem
// uma cópia da mesma regra em FormFillScreen.tsx — se mudar aqui, mude lá.
//
// Qualquer pergunta pode ter uma condição (config.condDependsOn/condOperator/
// condValue, configurada em “Lógica de exibição” no construtor). Uma SEÇÃO com
// condição esconde todas as perguntas dela, até a próxima seção.

export type Answers = Record<string, unknown>;
type FieldLike = { id: string; type: string; config?: unknown };

export function isAnswered(answer: unknown): boolean {
  return answer !== null && answer !== undefined && answer !== ""
    && !(Array.isArray(answer) && answer.length === 0);
}

export function conditionMet(cfg: Record<string, unknown>, answers: Answers): boolean {
  const dependsOn = cfg.condDependsOn as string | undefined;
  if (!dependsOn) return true; // sem condição configurada → sempre visível
  const operator = (cfg.condOperator as string) || "answered";
  const target   = String(cfg.condValue ?? "");
  const answer   = answers[dependsOn];
  const answered = isAnswered(answer);
  if (operator === "answered") return answered;
  if (!answered) return false;
  const values = Array.isArray(answer) ? answer.map(String) : [String(answer)];
  if (operator === "equals")     return values.includes(target);
  if (operator === "not_equals") return !values.includes(target);
  if (operator === "contains")   return values.some(v => v.toLowerCase().includes(target.toLowerCase()));
  if (operator === "gt" || operator === "lt") {
    const n = Number(String(answer).replace(",", "."));
    const t = Number(target.replace(",", "."));
    if (!Number.isFinite(n) || !Number.isFinite(t)) return false;
    return operator === "gt" ? n > t : n < t;
  }
  return true;
}

/**
 * Ids das perguntas visíveis agora, na ordem do formulário. A avaliação segue a
 * ordem e só “enxerga” respostas de perguntas que estão visíveis — se a pessoa
 * volta e muda uma resposta, o que dependia em cadeia some junto.
 */
export function visibleFieldIds(fields: FieldLike[], answers: Answers): Set<string> {
  const visible = new Set<string>();
  const effective: Answers = {};
  let sectionOpen = true;
  for (const f of fields) {
    const cfg = (f.config ?? {}) as Record<string, unknown>;
    if (f.type === "section") { sectionOpen = conditionMet(cfg, effective); continue; }
    if (!sectionOpen || !conditionMet(cfg, effective)) continue;
    visible.add(f.id);
    if (f.id in answers) effective[f.id] = answers[f.id];
  }
  return visible;
}

/** Remove respostas de perguntas que ficaram ocultas — não vão para o banco. */
export function onlyVisibleAnswers<A extends Answers>(fields: FieldLike[], answers: A): A {
  const visible = visibleFieldIds(fields, answers);
  return Object.fromEntries(Object.entries(answers).filter(([k]) => visible.has(k))) as A;
}
