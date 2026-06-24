import type { Metadata } from "next";
import { signIn } from "@/lib/auth";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <div>
      <h1 className="text-lg font-semibold text-gray-900 mb-1">Entrar na plataforma</h1>
      <p className="text-sm text-gray-500 mb-6">Acesse sua conta para gerenciar suas pesquisas.</p>
      <div className="flex flex-col gap-3">
        <form action={async () => { "use server"; await signIn("google", { redirectTo: "/dashboard" }); }}>
          <button type="submit" className="w-full flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Entrar com Google
          </button>
        </form>
        <form action={async () => { "use server"; await signIn("orcid", { redirectTo: "/dashboard" }); }}>
          <button type="submit" className="w-full flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Entrar com ORCID
          </button>
        </form>
      </div>
      <p className="mt-6 text-center text-xs text-gray-400">
        Ao entrar, você concorda com nossa{" "}
        <a href="/privacidade" className="underline hover:text-gray-600">Política de Privacidade</a>{" "}
        em conformidade com a LGPD.
      </p>
    </div>
  );
}
