import { db } from "@/lib/db";
import { subscriptions, payments, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiSuccess, apiError } from "@/lib/utils";

// Eventos que confirmam recebimento — o que interessa pra liberar/renovar
// o plano. Outros eventos (ex. PAYMENT_OVERDUE, PAYMENT_DELETED) ainda não
// são tratados nesta fase; retornam 200 do mesmo jeito pra não gerar
// retentativa do Asaas por engano.
const CONFIRMING_EVENTS = ["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"];

interface AsaasWebhookPayload {
  event: string;
  payment?: {
    id: string;
    customer: string;
    value: number;
    billingType: string;
    status: string;
  };
}

// POST — notificação de pagamento do Asaas. Ainda não testável de ponta a
// ponta (precisa da chave/token real do Asaas, que Israel vai gerar no
// sandbox) — estrutura pronta, comportamento a confirmar contra evento real.
export async function POST(request: Request) {
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!expectedToken) return apiError("Webhook não configurado", 401);
  if (request.headers.get("asaas-access-token") !== expectedToken) {
    return apiError("Token inválido", 401);
  }

  const body = (await request.json().catch(() => null)) as AsaasWebhookPayload | null;
  if (!body?.event) return apiError("Corpo inválido", 400);

  if (!CONFIRMING_EVENTS.includes(body.event) || !body.payment) {
    return apiSuccess({ ignored: true, event: body.event });
  }

  const { payment } = body;

  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.asaasCustomerId, payment.customer),
  });
  if (!subscription) {
    // Cliente Asaas sem assinatura nossa correspondente — não deveria
    // acontecer, mas devolve 200 pra não entrar em retentativa infinita.
    return apiSuccess({ matched: false });
  }

  await db.insert(payments).values({
    subscriptionId: subscription.id,
    asaasPaymentId: payment.id,
    status:         "confirmed",
    value:          payment.value,
    billingType:    payment.billingType,
    paidAt:         new Date(),
  }).onConflictDoUpdate({
    target: payments.asaasPaymentId,
    set:    { status: "confirmed", paidAt: new Date() },
  });

  await db.update(subscriptions)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(subscriptions.id, subscription.id));

  await db.update(users)
    .set({ plan: subscription.plan })
    .where(eq(users.id, subscription.userId));

  return apiSuccess({ matched: true });
}
