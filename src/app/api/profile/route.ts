import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/utils";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const body = await request.json();
  const { name, bio, institution, orcid, lattesUrl, publicProfile } = body;

  const [updated] = await db
    .update(users)
    .set({
      name:          name          ?? undefined,
      bio:           bio           ?? undefined,
      institution:   institution   ?? undefined,
      orcid:         orcid         ?? undefined,
      lattesUrl:     lattesUrl     ?? undefined,
      publicProfile: publicProfile ?? undefined,
      updatedAt:     new Date(),
    })
    .where(eq(users.id, session.user.id))
    .returning();

  return apiSuccess(updated);
}
