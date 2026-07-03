import { Resend } from "resend";

// RESEND_API_KEY ainda não está configurada em produção (ver .env.example) —
// enquanto isso, o envio vira um no-op com aviso no log, sem quebrar quem
// chamou. Assim que Israel criar a conta Resend e configurar a env var na
// Vercel, o envio passa a funcionar sem precisar mudar nada aqui.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendEmail(params: { to: string; subject: string; html: string }): Promise<void> {
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY não configurada — e-mail não enviado (assunto: "${params.subject}", para: ${params.to})`);
    return;
  }
  await resend.emails.send({
    from: process.env.RESEND_FROM ?? "Dataº <no-reply@datazero.com.br>",
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}
