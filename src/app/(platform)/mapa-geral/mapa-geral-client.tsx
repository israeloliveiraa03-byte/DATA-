"use client";

import dynamic from "next/dynamic";
import type { NetworkMapPin } from "@/lib/network/build-network-map";

const NetworkMap = dynamic(
  () => import("@/components/network/network-map").then(m => m.NetworkMap),
  { ssr: false, loading: () => <div className="h-full rounded-lg bg-ink-900 border border-ink-700 animate-pulse" aria-label="Carregando mapa..." /> }
);

export function MapaGeralClient({ pins }: { pins: NetworkMapPin[] }) {
  const openCallCount = pins.filter(p => p.hasOpenCall).length;
  const researchCount = pins.reduce((sum, p) => sum + p.researches.length, 0);

  return (
    <div className="flex-1 overflow-auto bg-ink-950 flex flex-col">
      <div className="p-6 pb-4 max-w-5xl mx-auto w-full flex-shrink-0">
        <p className="text-xs font-bold uppercase tracking-widest font-condensed text-brand-400 mb-1">Rede</p>
        <h1 className="text-2xl font-bold font-condensed text-ink-100">Mapa Geral</h1>
        <p className="text-sm text-ink-300 mt-0.5">
          {pins.length} {pins.length === 1 ? "entidade visível" : "entidades visíveis"} · {researchCount} {researchCount === 1 ? "pesquisa ativa" : "pesquisas ativas"}
          {openCallCount > 0 && <> · {openCallCount} com chamada aberta</>}
        </p>
        <p className="text-xs text-ink-500 mt-1">
          Só aparece aqui quem optou por isso — entidades e pesquisas continuam ocultas por padrão.
        </p>
      </div>
      <div className="flex-1 min-h-0 px-6 pb-6 max-w-5xl mx-auto w-full">
        <div className="h-full min-h-[480px]">
          <NetworkMap pins={pins} />
        </div>
      </div>
    </div>
  );
}
