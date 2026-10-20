import { db } from "@/lib/db";
import { responses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getRequestUserId } from "@/lib/auth/device";
import { getResearchAccess } from "@/lib/researches/access";
import { parseMediaPath, readPrivateMedia } from "@/lib/media/storage";

// GET /api/media/file/respostas/{responseId}/{fieldId}/{arquivo}
// Entrega uma foto/arquivo de resposta guardado no store PRIVADO, só para:
//   - quem coletou a resposta, ou
//   - qualquer pessoa da equipe da pesquisa (dono, editor ou visualizador).
// A checagem é feita aqui mesmo, ao lado da leitura (recomendação da Vercel:
// nada de cache compartilhado na CDN nem autenticação só em middleware).
export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const pathname = path.map(decodeURIComponent).join("/");
  const ids = parseMediaPath(pathname);
  if (!ids) return new Response("Not found", { status: 404 });

  const userId = await getRequestUserId(request);
  if (!userId) return new Response("Não autorizado", { status: 401 });

  const response = await db.query.responses.findFirst({
    where: eq(responses.id, ids.responseId),
    columns: { respondentId: true, researchId: true },
  });
  if (!response) return new Response("Not found", { status: 404 });
  if (response.respondentId !== userId) {
    const access = await getResearchAccess(response.researchId, userId);
    if (!access) return new Response("Not found", { status: 404 });
  }

  const result = await readPrivateMedia(pathname, request.headers.get("if-none-match") ?? undefined);
  if (!result) return new Response("Not found", { status: 404 });

  if (result.statusCode === 304) {
    return new Response(null, { status: 304, headers: { ETag: result.blob.etag, "Cache-Control": "private, no-cache" } });
  }
  return new Response(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType,
      "X-Content-Type-Options": "nosniff",
      ETag: result.blob.etag,
      "Cache-Control": "private, no-cache",
    },
  });
}
