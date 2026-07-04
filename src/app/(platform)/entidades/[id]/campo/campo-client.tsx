"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { normalizeBoundaryGeo, replaceBoundaryFeature, findBoundaryFeature, BOUNDARY_ROLE } from "@/lib/entities/geo-format";
import type { Entity } from "@/lib/types";
import type { Feature, Polygon } from "geojson";

interface Point { lat: number; lng: number; }

interface Props {
  entity: Entity;
}

// Mini-pesquisa de campo (Fase 3, essencial): captação de pontos/limites em campo via GPS,
// gravados como o contorno principal (role: "boundary") dentro da FeatureCollection da
// entidade — substitui só esse contorno ao salvar, preservando outras feições (pontos de
// interesse) que o pesquisador já tenha marcado no editor de mesa. TODO: versão mais completa
// (diário de campo com fotos/offline/múltiplos colaboradores por sessão) fica para quando a
// Onda 3 de tipos de campo (field_diary) for implementada no form-builder — fora de escopo agora.
export function CampoClient({ entity }: Props) {
  const router = useRouter();
  const existingFC = normalizeBoundaryGeo(entity.boundaryPolygon);
  const existingBoundary = findBoundaryFeature(existingFC);
  const initialPoints: Point[] = existingBoundary?.geometry.type === "Polygon"
    ? (existingBoundary.geometry as Polygon).coordinates[0].slice(0, -1).map(([lng, lat]) => ({ lat, lng }))
    : [];
  const [points,   setPoints]   = useState<Point[]>(initialPoints);
  const [capturing, setCapturing] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [saved,     setSaved]     = useState(false);

  function capturePoint() {
    if (!navigator.geolocation) { setError("Este dispositivo/navegador não suporta captura de GPS."); return; }
    setCapturing(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      pos => {
        setPoints(p => [...p, { lat: pos.coords.latitude, lng: pos.coords.longitude }]);
        setCapturing(false);
        setSaved(false);
      },
      () => { setError("Não foi possível obter a localização agora. Tente de novo."); setCapturing(false); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  function removePoint(index: number) {
    setPoints(p => p.filter((_, i) => i !== index));
    setSaved(false);
  }

  async function savePolygon() {
    setSaving(true);
    setError("");
    try {
      const ring = points.map(p => [p.lng, p.lat]);
      if (ring.length > 0) ring.push(ring[0]);
      const boundaryFeature: Feature<Polygon> = {
        type: "Feature",
        properties: { role: BOUNDARY_ROLE },
        geometry: { type: "Polygon", coordinates: [ring] },
      };
      const updatedFC = replaceBoundaryFeature(existingFC, boundaryFeature);

      const res = await fetch(`/api/entities/${entity.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boundaryPolygon: updatedFC,
          changeNote: "Pontos capturados em campo (mini-pesquisa de campo)",
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Erro ao salvar"); return; }
      setSaved(true);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-1 overflow-auto bg-white">
      <div className="p-6 max-w-lg mx-auto">
        <div className="flex items-center gap-2 text-xs mb-5 text-slate-500">
          <Link href={`/entidades/${entity.id}`} className="hover:underline text-brand-600">{entity.name}</Link>
          <i className="ti ti-chevron-right text-xs" />
          <span className="text-slate-700">Captação em campo</span>
        </div>

        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-1">Mini-pesquisa de campo</p>
          <h1 className="text-xl font-bold text-slate-900">Capturar pontos/limites</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Toque em &quot;Capturar ponto&quot; em cada marco do limite do território, caminhando pela área.
            Ao final, salve — os pontos viram o polígono da entidade.
          </p>
        </div>

        <Button type="button" size="lg" loading={capturing} onClick={capturePoint} className="w-full mb-4">
          <i className="ti ti-map-pin-plus" /> Capturar ponto ({points.length})
        </Button>

        {points.length > 0 && (
          <ul className="flex flex-col gap-1.5 mb-4">
            {points.map((pt, i) => (
              <li key={i} className="flex items-center justify-between text-xs bg-slate-50 rounded-md px-3 py-2 border border-slate-100">
                <span className="font-mono text-slate-600">#{i + 1} · {pt.lat.toFixed(5)}, {pt.lng.toFixed(5)}</span>
                <button type="button" onClick={() => removePoint(i)} className="text-slate-400 hover:text-red-500" aria-label={`Remover ponto ${i + 1}`}>
                  <i className="ti ti-x text-xs" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {points.length > 0 && points.length < 3 && (
          <p className="text-xs text-amber-600 mb-3">Capture ao menos 3 pontos para formar um polígono.</p>
        )}

        {error && <p className="text-sm text-red-500 flex items-center gap-1 mb-3"><i className="ti ti-alert-circle" /> {error}</p>}
        {saved && <p className="text-sm text-teal-700 flex items-center gap-1 mb-3"><i className="ti ti-circle-check" /> Limite salvo na entidade.</p>}

        <div className="flex items-center gap-3">
          <Button type="button" loading={saving} disabled={points.length < 3} onClick={savePolygon}>
            Salvar como limite da entidade
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push(`/entidades/${entity.id}`)}>
            Voltar
          </Button>
        </div>
      </div>
    </div>
  );
}
