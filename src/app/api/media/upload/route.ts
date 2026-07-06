import { randomUUID } from "crypto";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import { formFields, responses } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getRequestUserId } from "@/lib/auth/device";
import { apiSuccess, apiError } from "@/lib/utils";
import { z } from "zod";

// Upload de mídia de resposta (foto/arquivo capturado no app de campo).
//
// Formato: multipart/form-data com `file` + `responseId` + `fieldId` —
// mais simples dos dois lados que binário cru (o app monta um FormData
// nativo, o servidor lê com request.formData(), e o nome/mime do arquivo
// viajam de graça dentro do multipart).
//
// A resposta já precisa existir no servidor (o syncWorker do app sobe a
// resposta primeiro, mídia depois). O arquivo vai pro Vercel Blob
// (store datazero-media, acesso público — URLs de alta entropia, decisão
// consciente de simplicidade por ora) e a URL volta pro app, que então
// atualiza o campo da resposta via PATCH /api/responses/[id].
//
// Limite de 4MB: o corpo de requisição em function da Vercel tem teto de
// ~4,5MB — um limite de 10MB nunca chegaria a executar. O app comprime
// fotos na captura (quality 70, largura máx. 1600px) pra ficar bem abaixo.

const MAX_BYTES = 4 * 1024 * 1024;

// Campo `image` só aceita imagem; campo `file` aceita imagem + formatos
// genéricos de documento. Nada fora da lista entra (mime → extensão).
const IMAGE_MIMES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png":  "png",
  "image/webp": "webp",
};

const FILE_MIMES: Record<string, string> = {
  ...IMAGE_MIMES,
  "application/pdf": "pdf",
  "text/plain":      "txt",
  "text/csv":        "csv",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.oasis.opendocument.text":        "odt",
  "application/vnd.oasis.opendocument.spreadsheet": "ods",
  "application/zip": "zip",
};

const paramsSchema = z.object({
  responseId: z.string().uuid(),
  fieldId:    z.string().uuid(),
});

export async function POST(request: Request) {
  // Token de dispositivo (app de campo) ou cookie de sessão (site).
  const userId = await getRequestUserId(request);
  if (!userId) return apiError("Não autorizado", 401);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return apiError("Esperado multipart/form-data com o arquivo", 400);
  }

  const parsed = paramsSchema.safeParse({
    responseId: form.get("responseId"),
    fieldId:    form.get("fieldId"),
  });
  if (!parsed.success) return apiError("responseId e fieldId (UUID) são obrigatórios", 422);
  const { responseId, fieldId } = parsed.data;

  const file = form.get("file");
  if (!(file instanceof File)) return apiError("Arquivo ausente no campo 'file'", 422);
  if (file.size === 0) return apiError("Arquivo vazio", 422);
  if (file.size > MAX_BYTES) return apiError("Arquivo acima do limite de 4MB", 413);

  // A resposta precisa existir e pertencer a quem envia (quem coletou) —
  // ou ao dono da pesquisa, que também pode anexar mídia.
  const response = await db.query.responses.findFirst({
    where: eq(responses.id, responseId),
    columns: { id: true, formId: true, respondentId: true },
    with: { research: { columns: { ownerId: true } } },
  });
  if (!response) return apiError("Resposta não encontrada — sincronize a resposta antes da mídia", 404);
  if (response.respondentId !== userId && response.research.ownerId !== userId) {
    return apiError("Sem permissão sobre esta resposta", 403);
  }

  // O campo precisa ser do formulário da resposta e de um tipo que aceite arquivo.
  const field = await db.query.formFields.findFirst({
    where: and(eq(formFields.id, fieldId), eq(formFields.formId, response.formId)),
    columns: { id: true, type: true },
  });
  if (!field) return apiError("Campo não encontrado neste formulário", 404);

  const allowed = field.type === "image" ? IMAGE_MIMES
    : field.type === "file" ? FILE_MIMES
    : null;
  if (!allowed) return apiError("Este campo não aceita envio de arquivo", 422);

  const ext = allowed[file.type];
  if (!ext) return apiError(`Tipo de arquivo não aceito (${file.type || "desconhecido"})`, 422);

  try {
    const blob = await put(
      `respostas/${responseId}/${fieldId}/${randomUUID()}.${ext}`,
      file,
      { access: "public", contentType: file.type }
    );
    return apiSuccess({ url: blob.url });
  } catch (err) {
    console.error("Falha no upload pro Vercel Blob", err);
    return apiError("Falha ao armazenar o arquivo — tente novamente", 500);
  }
}
