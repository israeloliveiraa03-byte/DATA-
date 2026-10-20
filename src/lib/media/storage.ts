import { put, get } from "@vercel/blob";

// Onde ficam as fotos e arquivos capturados em campo (respostas de pesquisa).
//
// Por que existem dois modos:
//   - Público (como era até out/2026): o arquivo ganha um endereço na internet
//     que qualquer pessoa com o link abre, sem login. Para foto de pessoa ou
//     de território de comunidade tradicional, isso conflita com a LGPD.
//   - Privado: o arquivo vai para um repositório (store) PRIVADO da Vercel.
//     Ninguém abre direto — o navegador pede a /api/media/file/..., o servidor
//     confere se quem pede tem acesso à pesquisa e só então entrega o arquivo.
//
// O modo privado liga sozinho quando existe a variável de ambiente
// MEDIA_PRIVATE_READ_WRITE_TOKEN — criada pela Vercel ao conectar um store
// privado ao projeto com o prefixo "MEDIA_PRIVATE". Sem ela, continua o
// comportamento antigo (público), pra nada quebrar antes da configuração.
//
// As imagens da biblioteca de figurinhas dos painéis (user_assets) continuam
// no store público: elas existem justamente pra aparecer em painéis públicos.

const PRIVATE_TOKEN = process.env.MEDIA_PRIVATE_READ_WRITE_TOKEN;

export const MEDIA_ROUTE_PREFIX = "/api/media/file/";

export function isPrivateMediaEnabled(): boolean {
  return !!PRIVATE_TOKEN;
}

/** Guarda o arquivo e devolve o endereço que vai gravado na resposta. */
export async function storeResponseMedia(pathname: string, file: File): Promise<string> {
  if (PRIVATE_TOKEN) {
    await put(pathname, file, { access: "private", contentType: file.type, token: PRIVATE_TOKEN });
    // Endereço relativo do próprio Dataº — passa pela checagem de acesso.
    return `${MEDIA_ROUTE_PREFIX}${pathname}`;
  }
  const blob = await put(pathname, file, { access: "public", contentType: file.type });
  return blob.url;
}

/** Busca um arquivo do store privado (o chamador já conferiu a permissão). */
export async function readPrivateMedia(pathname: string, ifNoneMatch?: string) {
  if (!PRIVATE_TOKEN) return null;
  return get(pathname, { access: "private", token: PRIVATE_TOKEN, ifNoneMatch });
}

/** respostas/{responseId}/{fieldId}/{arquivo} → ids, ou null se o caminho não segue o padrão. */
export function parseMediaPath(pathname: string): { responseId: string; fieldId: string } | null {
  const m = /^respostas\/([0-9a-f-]{36})\/([0-9a-f-]{36})\/[0-9a-f-]{36}\.[a-z0-9]{2,5}$/i.exec(pathname);
  return m ? { responseId: m[1], fieldId: m[2] } : null;
}
