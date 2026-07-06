import { createHash } from "crypto";
import { db } from "@/lib/db";
import { deviceTokens } from "@/lib/db/schema";
import { and, eq, isNull, gt } from "drizzle-orm";
import { auth } from "@/lib/auth";

// Autenticação alternativa ao cookie de sessão do NextAuth, usada pelo app de
// campo (Capacitor): o app manda `Authorization: Bearer <token>` e o servidor
// só conhece o hash SHA-256 do token (ver src/lib/db/schema/device-tokens.ts).

export function hashDeviceToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Lê o header `Authorization: Bearer <token>`, valida contra `device_tokens`
 * (não revogado, não expirado), atualiza `lastUsedAt` e devolve o `userId`
 * dono do token — ou `null` se não houver token válido.
 */
export async function getDeviceTokenUserId(request: Request): Promise<string | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;

  const token = header.slice("Bearer ".length).trim();
  if (!token) return null;

  const tokenHash = hashDeviceToken(token);
  const record = await db.query.deviceTokens.findFirst({
    where: and(
      eq(deviceTokens.tokenHash, tokenHash),
      isNull(deviceTokens.revokedAt),
      gt(deviceTokens.expiresAt, new Date()),
    ),
  });
  if (!record) return null;

  // Melhor esforço — o token continua válido mesmo se essa atualização falhar.
  try {
    await db.update(deviceTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(deviceTokens.id, record.id));
  } catch {
    // Não bloqueia a autenticação por falha em telemetria de uso.
  }

  return record.userId;
}

/**
 * Identidade do usuário da requisição por qualquer um dos dois meios:
 * token de dispositivo (app de campo) primeiro, cookie de sessão NextAuth
 * (site) como fallback. Usar em rotas GET que o app de campo também consome
 * (lista de pesquisas, formulário) — rotas de escrita administrativa
 * continuam só com sessão.
 */
export async function getRequestUserId(request: Request): Promise<string | null> {
  const fromToken = await getDeviceTokenUserId(request);
  if (fromToken) return fromToken;
  const session = await auth();
  return session?.user?.id ?? null;
}
