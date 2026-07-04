import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { supportTickets } from "@/lib/db/schema";
import { apiSuccess, apiError } from "@/lib/utils";
import { z } from "zod";

const createSchema = z.object({
  subject: z.string().min(3, "Mínimo 3 caracteres").max(300),
  message: z.string().min(5, "Conte um pouco mais").max(3000),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  const [ticket] = await db.insert(supportTickets).values({
    userId:  session.user.id,
    subject: parsed.data.subject,
    message: parsed.data.message,
  }).returning();

  return apiSuccess(ticket);
}
