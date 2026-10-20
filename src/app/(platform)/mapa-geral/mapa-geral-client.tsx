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
    <div className="bg-ink-950 flex flex-col">
      <div className="px-4 sm:px-6 lg:px-8 pt-8 pb-4 max-w-page mx-auto w-full flex-shrink-0">
        <p className="kicker mb-2">Rede de pesquisa</p>
        <h1 className="font-serif text-3xl font-semibold text-ink-50 leading-tight">Mapa Geral</h1>
        <p className="text-sm text-ink-300 mt-0.5">
          {pins.length} {pins.length === 1 ? "entidade visível" : "entidades visíveis"} · {researchCount} {researchCount === 1 ? "pesquisa ativa" : "pesquisas ativas"}
          {openCallCount > 0 && <> · {openCallCount} com chamada aberta</>}
        </p>
        <p className="text-xs text-ink-500 mt-1">
          Só aparece aqui quem optou por isso — entidades e pesquisas continuam ocultas por padrão.
        </p>
      </div>
      <div className="px-4 sm:px-6 lg:px-8 pb-8 max-w-page mx-auto w-full">
        <div className="h-[calc(100dvh-15rem)] min-h-[480px] rounded-xl overflow-hidden border border-ink-700 shadow-xs map-editorial">
          <NetworkMap pins={pins} />
        </div>
      </div>
    </div>
  );
}
