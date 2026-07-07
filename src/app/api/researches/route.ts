import { auth } from "@/lib/auth";
import { getRequestUserId } from "@/lib/auth/device";
import { db } from "@/lib/db";
import { researches } from "@/lib/db/schema";
import { createResearchSchema } from "@/lib/validations/research";
import { apiSuccess, apiError, slugify } from "@/lib/utils";
import { getMyResearches } from "@/lib/researches/access";

export async function GET(request: Request) {
  // Cookie de sessão (site) ou token de dispositivo (app de campo).
  const userId = await getRequestUserId(request);
  if (!userId) return apiError("Não autorizado", 401);
  const mine = await getMyResearches(userId);
  return apiSuccess(mine.map(m => m.research));
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
