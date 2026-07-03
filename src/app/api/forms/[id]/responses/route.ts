import { db } from "@/lib/db";
import { forms, responses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { after } from "next/server";
import { apiSuccess, apiError } from "@/lib/utils";
import { checkAndNotifyReliability } from "@/lib/dashboard/reliability";
import { z } from "zod";

const submitSchema = z.object({
  data: z.record(z.unknown()),
  collectedOffline: z.boolean().default(false),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const form = await db.query.forms.findFirst({ where: eq(forms.id, id) });
  if (!form) return apiError("Formulário não encontrado", 404);

  const session = await auth();
  const body = await request.json();
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message, 422);

  const { data, collectedOffline, latitude, longitude } = parsed.data;
  const [response] = await db.insert(responses).values({
    formId: form.id,
    researchId: form.researchId,
    respondentId: session?.user?.id ?? null,
    data,
    collectedOffline,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    completed: true,
    submittedAt: new Date(),
    syncedAt: collectedOffline ? new Date() : null,
  }).returning({ id: responses.id });

  // Roda depois da resposta já ter sido enviada pro cliente, mas garante que
  // a checagem termina de verdade (não é só um "dispara e esquece" que o
  // runtime serverless poderia cortar antes de terminar).
  after(() => checkAndNotifyReliability(form.researchId));

  return apiSuccess({ id: response.id });
}
