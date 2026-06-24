import { apiSuccess, apiError } from "@/lib/utils";

const IBGE_BASE = "https://servicodados.ibge.gov.br/api/v1/localidades";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type  = searchParams.get("type");
  const state = searchParams.get("state");

  if (type === "states") {
    const res = await fetch(`${IBGE_BASE}/estados?orderBy=nome`);
    if (!res.ok) return apiError("Erro ao buscar estados", 502);
    const data = await res.json();
    return apiSuccess(data.map((s: { id: number; nome: string; sigla: string }) => ({ id: s.id, nome: s.nome, sigla: s.sigla })));
  }

  if (type === "cities" && state) {
    const res = await fetch(`${IBGE_BASE}/estados/${state}/municipios?orderBy=nome`);
    if (!res.ok) return apiError("Erro ao buscar municípios", 502);
    const data = await res.json();
    return apiSuccess(data.map((c: { id: number; nome: string }) => ({ id: c.id, nome: c.nome })));
  }

  return apiError("Parâmetro type inválido. Use: states | cities", 400);
}
