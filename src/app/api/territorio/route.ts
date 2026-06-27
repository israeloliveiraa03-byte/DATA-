import { apiSuccess, apiError } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const required = [
      "cnpj","razaoSocial","naturezaJuridica","enderecoSede",
      "municipio","estado","tipoComunidade","historico",
      "territorioAtuacao","numeroMembros","nomeResponsavel",
      "cpfResponsavel","cargoResponsavel","emailResponsavel",
      "telefoneResponsavel",
    ];

    for (const field of required) {
      if (!body[field]) return apiError(`Campo obrigatório: ${field}`, 400);
    }

    // Log da candidatura (futuramente salvar no banco e enviar email)
    console.log("📋 Nova candidatura Dataº Território:", {
      razaoSocial:   body.razaoSocial,
      cnpj:          body.cnpj,
      tipo:          body.tipoComunidade,
      responsavel:   body.nomeResponsavel,
      email:         body.emailResponsavel,
      submittedAt:   new Date().toISOString(),
    });

    return apiSuccess({
      message: "Candidatura recebida com sucesso",
      trialDays: 30,
    });
  } catch {
    return apiError("Erro ao processar candidatura", 500);
  }
}
