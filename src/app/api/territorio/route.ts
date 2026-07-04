import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { territorioApplications } from "@/lib/db/schema";
import { apiSuccess, apiError } from "@/lib/utils";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Faça login antes de enviar a candidatura", 401);

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

    const [application] = await db.insert(territorioApplications).values({
      applicantUserId:     session.user.id,
      cnpj:                body.cnpj,
      razaoSocial:         body.razaoSocial,
      naturezaJuridica:    body.naturezaJuridica,
      enderecoSede:        body.enderecoSede,
      municipio:           body.municipio,
      estado:              body.estado,
      tipoComunidade:      body.tipoComunidade,
      historico:           body.historico,
      territorioAtuacao:   body.territorioAtuacao,
      numeroMembros:       body.numeroMembros,
      nomeResponsavel:     body.nomeResponsavel,
      cpfResponsavel:      body.cpfResponsavel,
      cargoResponsavel:    body.cargoResponsavel,
      emailResponsavel:    body.emailResponsavel,
      telefoneResponsavel: body.telefoneResponsavel,
    }).returning();

    return apiSuccess({ id: application.id, status: application.status });
  } catch {
    return apiError("Erro ao processar candidatura", 500);
  }
}
