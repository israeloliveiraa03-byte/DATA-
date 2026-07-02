import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const { searchParams } = new URL(request.url);
  const cnpj = (searchParams.get("cnpj") ?? "").replace(/\D/g, "");

  if (cnpj.length !== 14) return apiError("CNPJ inválido — informe os 14 dígitos", 422);

  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
  if (!res.ok) {
    if (res.status === 404) return apiError("CNPJ não encontrado na Receita Federal", 404);
    return apiError("Erro ao consultar a BrasilAPI", 502);
  }

  const data = await res.json();
  return apiSuccess({
    razaoSocial:  data.razao_social as string | undefined,
    nomeFantasia: data.nome_fantasia as string | undefined,
    stateCode:    data.uf as string | undefined,
    cityName:     data.municipio as string | undefined,
    street:       data.logradouro as string | undefined,
    number:       data.numero as string | undefined,
    district:     data.bairro as string | undefined,
    zip:          data.cep as string | undefined,
    raw:          data,
  });
}
