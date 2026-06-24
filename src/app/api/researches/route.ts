import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { researches } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { createResearchSchema } from "@/lib/validations/research";
import { apiSuccess, apiError, slugify } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);
  const data = await db.query.researches.findMany({
    where: eq(researches.ownerId, session.user.id),
    orderBy: desc(researches.createdAt),
  });
  return apiSuccess(data);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);
  const body = await request.json();
  const parsed = createResearchSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);
  const { title, ...rest } = parsed.data;
  const slug = `${slugify(title)}-${Date.now().toString(36)}`;
  const [research] = await db.insert(researches).values({ ownerId: session.user.id, title, slug, ...rest }).returning();
  return apiSuccess(research);
}
