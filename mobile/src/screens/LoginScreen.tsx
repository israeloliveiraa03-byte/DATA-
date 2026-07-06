// Entrada no app: pareamento por código de dispositivo.
//
// O login Google acontece no site (aberto via @capacitor/browser) — a página
// /parear-aparelho gera o token e o usuário cola aqui. Escolha deliberada
// desta fase: capturar a volta do OAuth dentro do app exigiria deep link
// (App Links/Universal Links) configurado e testado no Android Studio/Xcode,
// que não dá pra validar neste ambiente. O fluxo de colar o código funciona
// em qualquer aparelho sem configuração nativa extra.

import { useState } from "react";
import { Browser } from "@capacitor/browser";
import { API_BASE, storeToken, fetchResearches } from "../lib/api";
import { cacheResearches } from "../lib/localDb";

export function LoginScreen({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  async function openPairingPage() {
    await Browser.open({ url: `${API_BASE}/parear-aparelho` });
  }

  async function confirm() {
    const token = code.trim();
    if (!token) { setError("Cole o código gerado no site."); return; }
    setChecking(true);
    setError("");
    try {
      await storeToken(token);
      // Valida o token de verdade: busca as pesquisas do usuário. Se falhar,
      // o token é inválido/expirado — não deixa entrar com credencial morta.
      const researches = await fetchResearches();
      await cacheResearches(researches);
      onLoggedIn();
    } catch {
      setError("Código inválido ou expirado — gere um novo no site e tente de novo.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="screen">
      <p className="kicker">Dataº Campo</p>
      <h1 className="screen-title">Parear este aparelho</h1>
      <p className="screen-subtitle">
        Coleta de respostas e pontos de GPS sem internet, sincronizando com a
        plataforma Dataº quando a conexão voltar.
      </p>

      <div className="card">
        <p className="field-label">1. Gere o código no site</p>
        <p className="field-desc">
          Entre com sua conta Google no site do Dataº e gere um código de
          aparelho na página de pareamento.
        </p>
        <button className="btn btn--ghost" onClick={openPairingPage}>
          Abrir página de pareamento
        </button>
      </div>

      <div className="card">
        <p className="field-label">2. Cole o código aqui</p>
        <textarea
          className="input"
          rows={3}
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="Cole o código do aparelho gerado no site"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        {error && <p className="msg-error">{error}</p>}
        <div style={{ marginTop: 10 }}>
          <button className="btn" onClick={confirm} disabled={checking}>
            {checking ? <span className="spinner" /> : null}
            {checking ? "Verificando..." : "Entrar"}
          </button>
        </div>
      </div>

      <p className="msg-muted">
        O código fica guardado só neste aparelho e vale por 180 dias.
      </p>
    </div>
  );
}
