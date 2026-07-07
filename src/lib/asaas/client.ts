// Wrapper fino sobre a API do Asaas (https://docs.asaas.com). Base URL por
// env (`ASAAS_API_URL`) — sandbox por padrão, produção só quando a env var
// for trocada explicitamente. Ainda não é chamado por nenhuma tela: existe
// pronto pra fase 2 (tela de upgrade de plano), que precisa da chave real
// de Israel pra testar de ponta a ponta.

const BASE_URL = process.env.ASAAS_API_URL || "https://api-sandbox.asaas.com/v3";

class AsaasError extends Error {
  constructor(message: string, public status: number, public body: unknown) {
    super(message);
    this.name = "AsaasError";
  }
}

async function asaasFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) throw new Error("ASAAS_API_KEY não configurada");

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
      ...init?.headers,
    },
  });

  const body = await res.json().catch(() => null);
  if (!res.ok) throw new AsaasError(`Asaas respondeu ${res.status}`, res.status, body);
  return body as T;
}

export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
}

export async function createAsaasCustomer(input: { name: string; email: string; cpfCnpj: string; externalReference?: string }) {
  return asaasFetch<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export type AsaasBillingType = "PIX" | "BOLETO" | "CREDIT_CARD";
export type AsaasCycle = "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";

export interface AsaasSubscription {
  id: string;
  customer: string;
  status: string;
  nextDueDate: string;
}

export async function createAsaasSubscription(input: {
  customer: string;
  billingType: AsaasBillingType;
  value: number;
  cycle: AsaasCycle;
  nextDueDate: string;
  externalReference?: string;
  description?: string;
}) {
  return asaasFetch<AsaasSubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export { AsaasError };
