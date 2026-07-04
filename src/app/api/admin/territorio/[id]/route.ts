import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { territorioApplications, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/utils";
import { z } from "zod";

const patchSchema = z.object({
  status:     z.enum(["approved", "rejected"]),
  reviewNote: z.string().max(1000).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (session?.user?.role !== "admin") return apiError("Sem permissão", 403);

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  const application = await db.query.territorioApplications.findFirst({ where: eq(territorioApplications.id, id) });
  if (!application) return apiError("Candidatura não encontrada", 404);

  const [updated] = await db.update(territorioApplications).set({
    status:     parsed.data.status,
    reviewNote: parsed.data.reviewNote,
    reviewedBy: session.user.id,
    reviewedAt: new Date(),
  }).where(eq(territorioApplications.id, id)).returning();

  // Aprovar já libera o benefício direto na conta que se candidatou —
  // sem isso, a aprovação seria só um registro sem efeito prático.
  if (parsed.data.status === "approved") {
    await db.update(users).set({ plan: "institution" }).where(eq(users.id, application.applicantUserId));
  }

  return apiSuccess(updated);
}
