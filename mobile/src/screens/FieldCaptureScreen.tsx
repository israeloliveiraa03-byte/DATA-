// Captura de ponto territorial em campo — versão offline da mini-pesquisa de
// campo do site (src/app/(platform)/entidades/[id]/campo/campo-client.tsx):
// caminhar o limite do território tocando "Capturar ponto" (um GPS por ponto),
// gravar local e sincronizar como contorno principal (role: "boundary") da
// entidade quando a internet voltar — preservando pontos de interesse já
// marcados no editor de mesa (a mesclagem acontece no pushEntityBoundary).

import { useCallback, useEffect, useState } from "react";
import { Geolocation } from "@capacitor/geolocation";
import { Network } from "@capacitor/network";
import { fetchEntities, type ApiEntity } from "../lib/api";
import { cacheEntities, getCachedEntities, saveEntityEdit } from "../lib/localDb";
import { runSync } from "../lib/syncWorker";

interface Point { lat: number; lng: number; }

export function FieldCaptureScreen({ onBack }: { onBack: () => void }) {
  const [entities, setEntities]   = useState<ApiEntity[]>([]);
  const [entityId, setEntityId]   = useState("");
  const [points, setPoints]       = useState<Point[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [savedOffline, setSavedOffline] = useState<boolean | null>(null);

  const loadEntities = useCallback(async () => {
    const cached = await getCachedEntities();
    if (cached) setEntities(cached);
    const status = await Network.getStatus();
    if (status.connected) {
      try {
        const fresh = await fetchEntities();
        // Só território/comunidade têm contorno capturável em campo.
        const capturable = fresh.filter(e => e.type === "territorio" || e.type === "comunidade");
        setEntities(capturable);
        await cacheEntities(capturable);
      } catch { /* fica com o cache */ }
    }
  }, []);

  useEffect(() => { void loadEntities(); }, [loadEntities]);

  async function capturePoint() {
    setCapturing(true);
    setError("");
    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
      setPoints(p => [...p, { lat: pos.coords.latitude, lng: pos.coords.longitude }]);
    } catch {
      setError("Não foi possível obter a localização agora. Tente de novo.");
    } finally {
      setCapturing(false);
    }
  }

  function removePoint(index: number) {
    setPoints(p => p.filter((_, i) => i !== index));
  }

  async function save() {
    const entity = entities.find(e => e.id === entityId);
    if (!entity) { setError("Escolha a entidade (território/comunidade) primeiro."); return; }
    if (points.length < 3) { setError("Capture ao menos 3 pontos para formar um polígono."); return; }

    setSaving(true);
    setError("");
    try {
      await saveEntityEdit({
        id:         crypto.randomUUID(),
        entityId:   entity.id,
        entityName: entity.name,
        points,
        capturedAt: new Date().toISOString(),
        syncStatus: "pending",
        syncError:  null,
      });

      const status = await Network.getStatus();
      if (status.connected) {
        void runSync();
        setSavedOffline(false);
      } else {
        setSavedOffline(true);
      }
    } catch {
      setError("Não foi possível gravar neste aparelho. Tente de novo.");
    } finally {
      setSaving(false);
    }
  }

  if (savedOffline !== null) {
    return (
      <div className="screen">
        <div className="card" style={{ textAlign: "center", padding: 28 }}>
          <p style={{ fontSize: 40, margin: "0 0 8px" }}>{savedOffline ? "📥" : "✅"}</p>
          <h1 className="screen-title">{savedOffline ? "Salvo neste aparelho" : "Limite registrado"}</h1>
          <p className="screen-subtitle" style={{ marginBottom: 20 }}>
            {savedOffline
              ? "Sem conexão agora — os pontos sincronizam com a entidade quando a internet voltar."
              : "Os pontos foram enviados como contorno da entidade."}
          </p>
          <button className="btn" onClick={() => { setPoints([]); setSavedOffline(null); }}>
            Capturar outro limite
          </button>
          <div style={{ marginTop: 8 }}>
            <button className="btn btn--ghost" onClick={onBack}>Voltar às pesquisas</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="topbar">
        <button className="topbar-back" onClick={onBack}>‹ Voltar</button>
      </div>
      <p className="kicker">Mini-pesquisa de campo</p>
      <h1 className="screen-title">Capturar pontos/limites</h1>
      <p className="screen-subtitle">
        Escolha a entidade, caminhe pelo limite do território e toque em
        &quot;Capturar ponto&quot; em cada marco. Ao final, salve — os pontos
        viram o contorno da entidade.
      </p>

      <div className="card">
        <label className="field-label" htmlFor="entity-select">Entidade</label>
        <select id="entity-select" className="input" value={entityId} onChange={e => setEntityId(e.target.value)}>
          <option value="">Escolha o território/comunidade...</option>
          {entities.map(e => (
            <option key={e.id} value={e.id}>{e.code} — {e.name}</option>
          ))}
        </select>
        {entities.length === 0 && (
          <p className="msg-muted">
            Nenhuma entidade baixada — abra o app com internet uma vez pra carregar a lista.
          </p>
        )}
      </div>

      <button className="btn" onClick={capturePoint} disabled={capturing} style={{ marginBottom: 12 }}>
        {capturing ? <span className="spinner" /> : null}
        {capturing ? "Obtendo GPS..." : `Capturar ponto (${points.length})`}
      </button>

      {points.length === 0 && (
        <div className="empty" style={{ marginBottom: 12 }}>
          Nenhum ponto capturado ainda — vá até o primeiro marco do limite e
          toque no botão acima. Cada ponto usa o GPS do aparelho.
        </div>
      )}

      {points.map((pt, i) => (
        <div key={i} className="point-item">
          <span>#{i + 1} · {pt.lat.toFixed(5)}, {pt.lng.toFixed(5)}</span>
          <button className="point-remove" onClick={() => removePoint(i)} aria-label={`Remover ponto ${i + 1}`}>×</button>
        </div>
      ))}

      {points.length > 0 && points.length < 3 && (
        <p className="msg-error" style={{ color: "var(--amber-500)" }}>
          Capture ao menos 3 pontos para formar um polígono.
        </p>
      )}

      {error && <p className="msg-error">{error}</p>}

      <button className="btn" onClick={save} disabled={saving || points.length < 3} style={{ marginTop: 8 }}>
        {saving ? <span className="spinner" /> : null}
        Salvar como limite da entidade
      </button>
    </div>
  );
}
