import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ParearAparelhoClient } from "./parear-aparelho-client";

// Pareamento do app de campo (Dataº Campo, Capacitor): o app abre esta página
// no navegador do aparelho — o login Google acontece aqui, no site — e o
// usuário gera um token de dispositivo pra colar no app. Evita depender de
// deep link / captura de OAuth dentro do app nesta primeira fase.
export default async function ParearAparelhoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/parear-aparelho");

  return <ParearAparelhoClient />;
}
