"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { DataLogo } from "@/components/layout/data-logo";

const ROLE_LABEL: Record<string, string> = { editor: "editor", viewer: "visualizador" };

interface Props {
  token: string;
  researchTitle: string;
  role: string;
  invalid: boolean;
  isLoggedIn: boolean;
}

export function ConviteEquipeClient({ token, researchTitle, role, invalid, isLoggedIn }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function handleAccept() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/convite-equipe/${token}/accept`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Erro ao aceitar o convite"); return; }
      router.push(`/researches/${json.data.researchId}`);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <DataLogo />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h1 className="text-xl font-serif font-semibold text-slate-900 mb-1">Convite para equipe de pesquisa</h1>
          <p className="text-sm text-slate-500 mb-5">
            Você foi convidado(a) como <strong>{ROLE_LABEL[role] ?? role}</strong> na pesquisa &ldquo;{researchTitle}&rdquo;.
          </p>

          {invalid && (
            <p className="text-sm text-coral-500 flex items-center gap-1">
              <i className="ti ti-alert-circle" /> Este convite não está mais válido. Peça um novo link a quem convidou você.
            </p>
          )}

          {!invalid && !isLoggedIn && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Entre com sua conta para aceitar o convite.
              </p>
              <Button type="button" onClick={() => signIn("google", { callbackUrl: `/convite-equipe/${token}` })}>
                Entrar com Google
              </Button>
            </div>
          )}

          {!invalid && isLoggedIn && (
            <div className="space-y-3">
              {error && (
                <p className="text-sm text-coral-500 flex items-center gap-1">
                  <i className="ti ti-alert-circle" /> {error}
                </p>
              )}
              <Button type="button" loading={loading} onClick={handleAccept} className="w-full">
                Aceitar convite
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
