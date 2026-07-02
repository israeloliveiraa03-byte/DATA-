import crypto from "node:crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { entityPersonInvites } from "@/lib/db/schema";
import { createPersonInviteSchema } from "@/lib/validations/entity";
import { apiSuccess, apiError } from "@/lib/utils";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const body = await request.json();
  const parsed = createPersonInviteSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 dias

  const [invite] = await db.insert(entityPersonInvites).values({
    token,
    createdBy:     session.user.id,
    researchId:    parsed.data.researchId,
    suggestedName: parsed.data.suggestedName,
    contact:       parsed.data.contact,
    expiresAt,
  }).returning();

  return apiSuccess(invite);
}
