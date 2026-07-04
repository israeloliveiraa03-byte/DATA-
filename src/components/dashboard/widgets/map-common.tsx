"use client";

// Base comum dos widgets de mapa do dashboard (mapa de pontos e mapa de
// calor). Importado só por eles — que já entram via next/dynamic({ ssr:
// false }) no widget-renderer — então nada daqui roda em SSR.
//
// O import do CSS abaixo era o bug do "mapa cortado, não mostra nada":
// leaflet.css só era importado em rotas de outra frente (/p/[slug] e o
// editor de polígono de entidade), que o Next.js code-splitta — nas rotas
// de dashboard os painéis do Leaflet (tiles, controles, marcadores)
// renderizavam sem posicionamento absoluto e o mapa desmontava visualmente.
import "leaflet/dist/leaflet.css";

import { useEffect } from "react";
import { TileLayer, LayersControl, useMap } from "react-leaflet";
import type { BasemapKey } from "@/lib/dashboard/types";

// Provedores XYZ gratuitos, sem chave de API (regra do projeto: nada de
// Mapbox/Google Maps). maxZoom respeita o limite real de cada provedor.
const BASEMAPS: Record<BasemapKey, { label: string; url: string; attribution: string; maxZoom: number }> = {
  light: {
    label: "Claro",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
  },
  dark: {
    label: "Escuro",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
  },
  satellite: {
    label: "Satélite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics",
    maxZoom: 19,
  },
  topo: {
    label: "Relevo",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, SRTM | Style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    maxZoom: 17,
  },
};

const BASEMAP_ORDER: BasemapKey[] = ["light", "dark", "satellite", "topo"];

// Controle de camadas do Leaflet com os 4 mapas-base ("tipos de relevo").
// `defaultBasemap` vem do config do widget (escolhido no builder); o leitor
// do dashboard publicado ainda pode trocar à vontade pelo controle no canto.
// O `key` força remontagem quando o padrão muda no editor — o `checked` do
// LayersControl.BaseLayer só é lido na montagem, não é reativo.
export function BasemapLayers({ defaultBasemap }: { defaultBasemap?: string }) {
  const active: BasemapKey = (BASEMAP_ORDER as string[]).includes(defaultBasemap ?? "") ? (defaultBasemap as BasemapKey) : "light";
  return (
    <LayersControl key={active} position="topright">
      {BASEMAP_ORDER.map(k => {
        const b = BASEMAPS[k];
        return (
          <LayersControl.BaseLayer key={k} name={b.label} checked={k === active}>
            <TileLayer url={b.url} attribution={b.attribution} maxZoom={b.maxZoom} />
          </LayersControl.BaseLayer>
        );
      })}
    </LayersControl>
  );
}

// Zoom por scroll só depois que o usuário interage com o mapa (clique ou
// toque), e desligado de novo quando o mouse sai — padrão comum em mapas
// embutidos em página com rolagem: evita o mapa "sequestrar" o scroll de
// quem só está rolando o dashboard, sem tirar o zoom de quem quer usá-lo.
// Os botões +/- do próprio Leaflet ficam sempre disponíveis.
export function ScrollZoomOnFocus() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const enable = () => map.scrollWheelZoom.enable();
    const disable = () => map.scrollWheelZoom.disable();
    container.addEventListener("click", enable);
    container.addEventListener("touchstart", enable, { passive: true });
    container.addEventListener("mouseleave", disable);
    return () => {
      container.removeEventListener("click", enable);
      container.removeEventListener("touchstart", enable);
      container.removeEventListener("mouseleave", disable);
    };
  }, [map]);
  return null;
}
