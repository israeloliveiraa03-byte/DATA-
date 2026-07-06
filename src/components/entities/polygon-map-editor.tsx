"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";
import * as turf from "@turf/turf";
import { toast } from "sonner";
import type { Feature, FeatureCollection } from "geojson";
import { BOUNDARY_ROLE } from "@/lib/entities/geo-format";
import { computeOverlaps, extractBoundary, formatHa, type NeighborBoundary } from "@/lib/entities/boundary-compare";

// Fix conhecido: os ícones padrão do Leaflet quebram sob bundlers (Webpack/Turbopack)
// porque resolvem os assets via URL relativa ao CSS, não ao bundle. Servimos via CDN.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export interface LatLngPoint { lat: number; lng: number; }

const BRAZIL_CENTER: LatLngPoint = { lat: -14.235, lng: -51.9253 };

// Mapas-base do editor: rua (OSM) pra contexto urbano/estradas, satélite
// (Esri World Imagery — mesmo provedor gratuito e sem chave já usado nos
// widgets de mapa do dashboard, ver map-common.tsx) pra traçar limite sobre
// terreno real: rio, borda de mata e clareira são visíveis na imagem.
const EDITOR_BASEMAPS = {
  street: {
    label: "Mapa",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> colaboradores',
    maxZoom: 19,
  },
  satellite: {
    label: "Satélite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics",
    maxZoom: 19,
  },
} as const;
type BasemapKey = keyof typeof EDITOR_BASEMAPS;

// Cores dos territórios vizinhos e da área de sobreposição — semântica de
// dado (aviso), não tema.
const NEIGHBOR_COLOR = "#7c6fa8";
const OVERLAP_COLOR  = "#c2452d";

// Leaflet layers são objetos JS comuns — anexamos as propriedades GeoJSON
// direto neles (em vez de manter um Map paralelo) pra não perder a
// associação layer↔propriedades ao longo de criar/editar/excluir.
type LayerWithProps = L.Layer & { _datazeroProps?: Record<string, unknown> };

function buildFeatureCollection(group: L.FeatureGroup): FeatureCollection {
  const features: Feature[] = [];
  group.eachLayer(layer => {
    const anyLayer = layer as LayerWithProps & { toGeoJSON?: () => Feature };
    if (typeof anyLayer.toGeoJSON !== "function") return;
    const geo = anyLayer.toGeoJSON();
    features.push({ ...geo, properties: anyLayer._datazeroProps ?? geo.properties ?? {} });
  });
  return { type: "FeatureCollection", features };
}

function hasBoundary(group: L.FeatureGroup): boolean {
  let found = false;
  group.eachLayer(layer => {
    if ((layer as LayerWithProps)._datazeroProps?.role === BOUNDARY_ROLE) found = true;
  });
  return found;
}

function measurementFor(feature: Feature): string | null {
  try {
    if (feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon") {
      const area = turf.area(feature as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>);
      return `Área: ${(area / 10000).toFixed(2)} ha (${area.toFixed(0)} m²)`;
    }
    if (feature.geometry.type === "LineString") {
      const length = turf.length(feature as GeoJSON.Feature<GeoJSON.LineString>, { units: "kilometers" });
      return `Comprimento: ${length.toFixed(2)} km`;
    }
  } catch {
    return null;
  }
  return null;
}

interface DrawControlProps {
  initialValue: FeatureCollection;
  onCommit: (fc: FeatureCollection) => void;
  onMeasurement: (text: string | null) => void;
  onSelectFeature: (layer: LayerWithProps | null) => void;
  groupRef: React.MutableRefObject<L.FeatureGroup | null>;
  // Preenchido pelo DrawControl: recarrega o grupo de desenho a partir de
  // uma FeatureCollection — é como o desfazer/refazer restaura um estado.
  reloadRef: React.MutableRefObject<((fc: FeatureCollection) => void) | null>;
}

function DrawControl({ initialValue, onCommit, onMeasurement, onSelectFeature, groupRef, reloadRef }: DrawControlProps) {
  const map = useMap();
  const startValue = useRef(initialValue);

  useEffect(() => {
    const group = new L.FeatureGroup();
    map.addLayer(group);
    groupRef.current = group;

    function attach(layer: LayerWithProps) {
      layer.on("click", () => onSelectFeature(layer));
      group.addLayer(layer);
    }

    function loadFeatures(fc: FeatureCollection) {
      for (const feature of fc.features) {
        const geoLayer = L.geoJSON(feature, {
          pointToLayer: (_f, latlng) => L.marker(latlng),
        });
        geoLayer.eachLayer(l => {
          (l as LayerWithProps)._datazeroProps = feature.properties ?? {};
          attach(l as LayerWithProps);
        });
      }
    }

    // Carrega as feições já salvas (formato novo ou já normalizado de um
    // formato antigo — ver normalizeBoundaryGeo em src/lib/entities/geo-format.ts).
    loadFeatures(startValue.current);
    if (group.getLayers().length > 0) {
      map.fitBounds(group.getBounds(), { maxZoom: 15 });
    }

    // Desfazer/refazer: o editor guarda o histórico; aqui só sabemos
    // reconstruir o desenho a partir de qualquer estado do histórico.
    reloadRef.current = (fc: FeatureCollection) => {
      group.clearLayers();
      loadFeatures(fc);
    };

    const drawControl = new L.Control.Draw({
      draw: {
        polygon:  { allowIntersection: false, showArea: true },
        polyline: {},
        marker:   {},
        circle: false, circlemarker: false, rectangle: false,
      },
      edit: { featureGroup: group, remove: true },
    });
    map.addControl(drawControl);

    function handleCreated(e: L.DrawEvents.Created) {
      const layer = e.layer as LayerWithProps;
      // O primeiro polígono desenhado (se ainda não houver contorno) vira o
      // contorno principal do território — os demais são pontos/linhas/
      // polígonos de interesse dentro dele.
      const isPolygon = layer instanceof L.Polygon && !(layer instanceof L.Rectangle);
      layer._datazeroProps = isPolygon && !hasBoundary(group) ? { role: BOUNDARY_ROLE } : {};
      attach(layer);
      const fc = buildFeatureCollection(group);
      onCommit(fc);
      onMeasurement(measurementFor(fc.features[fc.features.length - 1]));
    }
    function handleEdited() {
      onCommit(buildFeatureCollection(group));
    }
    function handleDeleted() {
      onCommit(buildFeatureCollection(group));
      onMeasurement(null);
    }

    map.on(L.Draw.Event.CREATED, handleCreated as L.LeafletEventHandlerFn);
    map.on(L.Draw.Event.EDITED, handleEdited);
    map.on(L.Draw.Event.DELETED, handleDeleted);

    return () => {
      map.off(L.Draw.Event.CREATED, handleCreated as L.LeafletEventHandlerFn);
      map.off(L.Draw.Event.EDITED, handleEdited);
      map.off(L.Draw.Event.DELETED, handleDeleted);
      map.removeControl(drawControl);
      map.removeLayer(group);
      groupRef.current = null;
      reloadRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return null;
}

// Painel flutuante de atributos — editar/excluir a feição clicada no mapa,
// mesmo espírito do AttributePanel do GeoManager.
function AttributePanel({
  layer, onClose, onSave, onDelete,
}: {
  layer: LayerWithProps;
  onClose: () => void;
  onSave: (properties: Record<string, unknown>) => void;
  onDelete: () => void;
}) {
  const initial = Object.entries(layer._datazeroProps ?? {}).filter(([k]) => k !== "role");
  const [rows, setRows] = useState<[string, string][]>(initial.map(([k, v]) => [k, String(v ?? "")]));
  const [newKey, setNewKey] = useState("");
  const isBoundary = layer._datazeroProps?.role === BOUNDARY_ROLE;

  function addRow() {
    if (!newKey.trim()) return;
    setRows(prev => [...prev, [newKey.trim(), ""]]);
    setNewKey("");
  }

  function save() {
    const properties: Record<string, unknown> = isBoundary ? { role: BOUNDARY_ROLE } : {};
    for (const [k, v] of rows) if (k.trim()) properties[k.trim()] = v;
    onSave(properties);
  }

  return (
    <div className="absolute top-2 right-2 z-[1000] w-64 rounded-lg bg-white border border-gray-200 shadow-lg p-3 text-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="font-semibold text-gray-800">{isBoundary ? "Contorno principal" : "Ponto de interesse"}</p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>
      {rows.length === 0 && <p className="text-xs text-gray-400 mb-2">Sem atributos ainda — adicione abaixo.</p>}
      <div className="flex flex-col gap-1.5 mb-2">
        {rows.map(([key, value], i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 w-20 truncate flex-shrink-0">{key}</span>
            <input className="flex-1 text-xs border border-gray-200 rounded px-1.5 py-1 text-gray-800 bg-white" value={value}
              onChange={e => setRows(prev => prev.map((r, ri) => ri === i ? [r[0], e.target.value] : r))} />
            <button onClick={() => setRows(prev => prev.filter((_, ri) => ri !== i))} className="text-gray-300 hover:text-red-400">✕</button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mb-3">
        <input className="flex-1 text-xs border border-gray-200 rounded px-1.5 py-1 text-gray-800 bg-white placeholder:text-gray-400" placeholder="novo campo (ex: nome)"
          value={newKey} onChange={e => setNewKey(e.target.value)} onKeyDown={e => e.key === "Enter" && addRow()} />
        <button onClick={addRow} className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">+</button>
      </div>
      <div className="flex gap-1.5">
        <button onClick={save} className="flex-1 text-xs font-semibold px-2 py-1.5 rounded bg-emerald-700 text-white">Salvar</button>
        <button onClick={onDelete} className="text-xs font-semibold px-2 py-1.5 rounded bg-red-50 text-red-600">Excluir</button>
      </div>
    </div>
  );
}

interface PolygonMapEditorProps {
  value: FeatureCollection;
  onChange: (fc: FeatureCollection) => void;
  center?: LatLngPoint;
  // Contornos de outros territórios/comunidades já cadastrados (endpoint
  // /api/entities/boundaries) — desenhados como referência e cruzados com o
  // contorno atual pra avisar sobre sobreposição. Aviso, não bloqueio:
  // reivindicações sobrepostas são dado territorial real.
  neighbors?: NeighborBoundary[];
}

export function PolygonMapEditor({ value, onChange, center, neighbors = [] }: PolygonMapEditorProps) {
  const groupRef  = useRef<L.FeatureGroup | null>(null);
  const reloadRef = useRef<((fc: FeatureCollection) => void) | null>(null);
  const [measurement, setMeasurement] = useState<string | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<LayerWithProps | null>(null);
  const [basemap, setBasemap] = useState<BasemapKey>("street");
  const [showNeighbors, setShowNeighbors] = useState(true);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Histórico de desfazer/refazer. A pilha vive num ref (os handlers do
  // leaflet-draw são registrados uma vez só — ref evita closure velha);
  // o estado espelha índice/tamanho pra habilitar/desabilitar os botões e
  // `currentFC` alimenta a detecção de sobreposição.
  const historyRef = useRef<{ stack: FeatureCollection[]; index: number }>({ stack: [value], index: 0 });
  const [historyMeta, setHistoryMeta] = useState({ index: 0, length: 1 });
  const [currentFC, setCurrentFC] = useState<FeatureCollection>(value);
  // Contador de revisão pra remontar os overlays de interseção (o GeoJSON
  // do react-leaflet só lê `data` na montagem).
  const [revision, setRevision] = useState(0);

  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const commit = useCallback((fc: FeatureCollection) => {
    const h = historyRef.current;
    h.stack = [...h.stack.slice(0, h.index + 1), fc];
    h.index = h.stack.length - 1;
    setHistoryMeta({ index: h.index, length: h.stack.length });
    setCurrentFC(fc);
    setRevision(r => r + 1);
    onChangeRef.current(fc);
  }, []);

  const step = useCallback((delta: number) => {
    const h = historyRef.current;
    const next = h.index + delta;
    if (next < 0 || next >= h.stack.length) return;
    h.index = next;
    const fc = h.stack[next];
    setHistoryMeta({ index: h.index, length: h.stack.length });
    setCurrentFC(fc);
    setRevision(r => r + 1);
    setSelectedLayer(null);
    setMeasurement(null);
    reloadRef.current?.(fc);
    onChangeRef.current(fc);
  }, []);

  // Ctrl+Z / Ctrl+Shift+Z (ou Ctrl+Y) — ignorado quando o foco está num
  // campo de texto, pra não roubar o desfazer nativo do input.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) { e.preventDefault(); step(-1); }
      else if (key === "y" || (key === "z" && e.shiftKey)) { e.preventDefault(); step(1); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  // Sobreposição com territórios vizinhos — recalculada a cada mudança no
  // desenho. Pré-filtro por bounding box mantém isso barato.
  const overlaps = useMemo(
    () => computeOverlaps(extractBoundary(currentFC), neighbors),
    [currentFC, neighbors]
  );

  const firstPoint = value.features[0]?.geometry.type === "Point"
    ? { lng: (value.features[0].geometry as GeoJSON.Point).coordinates[0], lat: (value.features[0].geometry as GeoJSON.Point).coordinates[1] }
    : undefined;
  const initialCenter = center ?? firstPoint ?? BRAZIL_CENTER;

  function handleSaveAttributes(properties: Record<string, unknown>) {
    if (!selectedLayer || !groupRef.current) return;
    selectedLayer._datazeroProps = properties;
    commit(buildFeatureCollection(groupRef.current));
    setSelectedLayer(null);
  }

  function handleDeleteFeature() {
    if (!selectedLayer || !groupRef.current) return;
    groupRef.current.removeLayer(selectedLayer);
    commit(buildFeatureCollection(groupRef.current));
    setSelectedLayer(null);
    setMeasurement(null);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !groupRef.current) return;
    file.text().then(text => {
      const group = groupRef.current;
      if (!group) return;
      const parsed = JSON.parse(text);
      const fc: FeatureCollection = parsed.type === "FeatureCollection"
        ? parsed
        : { type: "FeatureCollection", features: [parsed.type === "Feature" ? parsed : { type: "Feature", geometry: parsed, properties: {} }] };

      for (const feature of fc.features) {
        const geoLayer = L.geoJSON(feature, { pointToLayer: (_f, latlng) => L.marker(latlng) });
        geoLayer.eachLayer(l => {
          const layer = l as LayerWithProps;
          layer._datazeroProps = feature.properties ?? {};
          layer.on("click", () => setSelectedLayer(layer));
          group.addLayer(layer);
        });
      }
      if (group.getLayers().length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (group as any)._map?.fitBounds(group.getBounds(), { maxZoom: 15 });
      }
      commit(buildFeatureCollection(group));
    }).catch(() => toast.error("Não conseguimos ler esse arquivo. Confira se é um GeoJSON válido."));
  }

  function handleExport() {
    if (!groupRef.current) return;
    const fc = buildFeatureCollection(groupRef.current);
    const blob = new Blob([JSON.stringify(fc, null, 2)], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "territorio.geojson";
    a.click();
    URL.revokeObjectURL(url);
  }

  const activeBasemap = EDITOR_BASEMAPS[basemap];
  const canUndo = historyMeta.index > 0;
  const canRedo = historyMeta.index < historyMeta.length - 1;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <input ref={importInputRef} type="file" accept=".json,.geojson" className="hidden" onChange={handleImport} />
        <button type="button" onClick={() => importInputRef.current?.click()}
          className="text-xs font-medium px-2.5 py-1.5 rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-50">
          Importar GeoJSON
        </button>
        <button type="button" onClick={handleExport}
          className="text-xs font-medium px-2.5 py-1.5 rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-50">
          Exportar GeoJSON
        </button>
        <span className="inline-flex rounded border border-gray-200 overflow-hidden" role="group" aria-label="Mapa-base">
          {(Object.keys(EDITOR_BASEMAPS) as BasemapKey[]).map(k => (
            <button key={k} type="button" onClick={() => setBasemap(k)}
              aria-pressed={basemap === k}
              className={`text-xs font-medium px-2.5 py-1.5 ${basemap === k ? "bg-gray-800 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}>
              {EDITOR_BASEMAPS[k].label}
            </button>
          ))}
        </span>
        <span className="inline-flex rounded border border-gray-200 overflow-hidden" role="group" aria-label="Desfazer e refazer">
          <button type="button" onClick={() => step(-1)} disabled={!canUndo} title="Desfazer (Ctrl+Z)"
            className="text-xs font-medium px-2.5 py-1.5 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white">
            <i className="ti ti-arrow-back-up" aria-hidden="true" /> Desfazer
          </button>
          <button type="button" onClick={() => step(1)} disabled={!canRedo} title="Refazer (Ctrl+Shift+Z)"
            className="text-xs font-medium px-2.5 py-1.5 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-white border-l border-gray-200">
            <i className="ti ti-arrow-forward-up" aria-hidden="true" /> Refazer
          </button>
        </span>
        {neighbors.length > 0 && (
          <label className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded border border-gray-200 bg-white text-gray-700 cursor-pointer select-none">
            <input type="checkbox" checked={showNeighbors} onChange={e => setShowNeighbors(e.target.checked)} className="accent-gray-700" />
            Territórios vizinhos
          </label>
        )}
        {measurement && <span className="text-xs text-gray-500">{measurement}</span>}
      </div>

      {overlaps.length > 0 && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-50 p-3 text-xs" role="status">
          <p className="font-semibold text-amber-600 mb-1">
            <i className="ti ti-alert-triangle" aria-hidden="true" /> Este contorno se sobrepõe a {overlaps.length === 1 ? "um território já cadastrado" : `${overlaps.length} territórios já cadastrados`}:
          </p>
          <ul className="text-amber-600 flex flex-col gap-0.5">
            {overlaps.map(o => (
              <li key={o.neighbor.id}>
                <strong>{o.neighbor.name}</strong> <span className="font-mono">({o.neighbor.code})</span> — sobreposição de ~{formatHa(o.areaHa)}
              </li>
            ))}
          </ul>
          <p className="text-amber-600/80 mt-1.5">
            Sobreposição não impede o salvamento — reivindicações territoriais sobrepostas são dado real. A área em conflito aparece destacada no mapa.
          </p>
        </div>
      )}

      <div className="relative rounded-lg overflow-hidden border border-gray-200" style={{ height: 400 }}>
        <MapContainer
          center={[initialCenter.lat, initialCenter.lng]}
          zoom={value.features.length ? 13 : 4}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            key={basemap}
            attribution={activeBasemap.attribution}
            url={activeBasemap.url}
            maxZoom={activeBasemap.maxZoom}
          />
          {showNeighbors && neighbors.map(n => (
            <GeoJSON
              key={n.id}
              data={n.boundary}
              style={{ color: NEIGHBOR_COLOR, weight: 1.5, dashArray: "4 4", fillColor: NEIGHBOR_COLOR, fillOpacity: 0.06 }}
              onEachFeature={(_f, layer) => layer.bindTooltip(`${n.name} (${n.code})`, { sticky: true })}
            />
          ))}
          {showNeighbors && overlaps.map(o => (
            <GeoJSON
              key={`overlap-${o.neighbor.id}-${revision}`}
              data={o.intersection}
              style={{ color: OVERLAP_COLOR, weight: 1, fillColor: OVERLAP_COLOR, fillOpacity: 0.3 }}
              interactive={false}
            />
          ))}
          <DrawControl
            initialValue={value}
            onCommit={commit}
            onMeasurement={setMeasurement}
            onSelectFeature={setSelectedLayer}
            groupRef={groupRef}
            reloadRef={reloadRef}
          />
        </MapContainer>
        {selectedLayer && (
          <AttributePanel
            layer={selectedLayer}
            onClose={() => setSelectedLayer(null)}
            onSave={handleSaveAttributes}
            onDelete={handleDeleteFeature}
          />
        )}
      </div>
      <p className="text-2xs text-gray-400">Marque pontos, linhas (trilhas) e polígonos — o primeiro polígono desenhado vira o contorno principal do território. Clique numa feição pra editar atributos ou excluir. Use o mapa-base Satélite pra traçar sobre o terreno real (rio, mata, clareira) e Ctrl+Z pra desfazer.</p>
    </div>
  );
}
