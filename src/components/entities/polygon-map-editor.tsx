"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";
import * as turf from "@turf/turf";
import { toast } from "sonner";
import type { Feature, FeatureCollection } from "geojson";
import { BOUNDARY_ROLE } from "@/lib/entities/geo-format";

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
  onChange: (fc: FeatureCollection) => void;
  onMeasurement: (text: string | null) => void;
  onSelectFeature: (layer: LayerWithProps | null) => void;
  groupRef: React.MutableRefObject<L.FeatureGroup | null>;
}

function DrawControl({ initialValue, onChange, onMeasurement, onSelectFeature, groupRef }: DrawControlProps) {
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

    // Carrega as feições já salvas (formato novo ou já normalizado de um
    // formato antigo — ver normalizeBoundaryGeo em src/lib/entities/geo-format.ts).
    for (const feature of startValue.current.features) {
      const geoLayer = L.geoJSON(feature, {
        pointToLayer: (_f, latlng) => L.marker(latlng),
      });
      geoLayer.eachLayer(l => {
        (l as LayerWithProps)._datazeroProps = feature.properties ?? {};
        attach(l as LayerWithProps);
      });
    }
    if (group.getLayers().length > 0) {
      map.fitBounds(group.getBounds(), { maxZoom: 15 });
    }

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
      onChange(fc);
      onMeasurement(measurementFor(fc.features[fc.features.length - 1]));
    }
    function handleEdited() {
      const fc = buildFeatureCollection(group);
      onChange(fc);
    }
    function handleDeleted() {
      onChange(buildFeatureCollection(group));
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
            <input className="flex-1 text-xs border border-gray-200 rounded px-1.5 py-1" value={value}
              onChange={e => setRows(prev => prev.map((r, ri) => ri === i ? [r[0], e.target.value] : r))} />
            <button onClick={() => setRows(prev => prev.filter((_, ri) => ri !== i))} className="text-gray-300 hover:text-red-400">✕</button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mb-3">
        <input className="flex-1 text-xs border border-gray-200 rounded px-1.5 py-1" placeholder="novo campo (ex: nome)"
          value={newKey} onChange={e => setNewKey(e.target.value)} onKeyDown={e => e.key === "Enter" && addRow()} />
        <button onClick={addRow} className="text-xs px-2 py-1 rounded bg-gray-100">+</button>
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
}

export function PolygonMapEditor({ value, onChange, center }: PolygonMapEditorProps) {
  const groupRef = useRef<L.FeatureGroup | null>(null);
  const [measurement, setMeasurement] = useState<string | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<LayerWithProps | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const firstPoint = value.features[0]?.geometry.type === "Point"
    ? { lng: (value.features[0].geometry as GeoJSON.Point).coordinates[0], lat: (value.features[0].geometry as GeoJSON.Point).coordinates[1] }
    : undefined;
  const initialCenter = center ?? firstPoint ?? BRAZIL_CENTER;

  function handleSaveAttributes(properties: Record<string, unknown>) {
    if (!selectedLayer || !groupRef.current) return;
    selectedLayer._datazeroProps = properties;
    onChange(buildFeatureCollection(groupRef.current));
    setSelectedLayer(null);
  }

  function handleDeleteFeature() {
    if (!selectedLayer || !groupRef.current) return;
    groupRef.current.removeLayer(selectedLayer);
    onChange(buildFeatureCollection(groupRef.current));
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
      onChange(buildFeatureCollection(group));
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

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <input ref={importInputRef} type="file" accept=".json,.geojson" className="hidden" onChange={handleImport} />
        <button type="button" onClick={() => importInputRef.current?.click()}
          className="text-xs font-medium px-2.5 py-1.5 rounded border border-gray-200 bg-white hover:bg-gray-50">
          Importar GeoJSON
        </button>
        <button type="button" onClick={handleExport}
          className="text-xs font-medium px-2.5 py-1.5 rounded border border-gray-200 bg-white hover:bg-gray-50">
          Exportar GeoJSON
        </button>
        {measurement && <span className="text-xs text-gray-500">{measurement}</span>}
      </div>
      <div className="relative rounded-lg overflow-hidden border border-gray-200" style={{ height: 400 }}>
        <MapContainer
          center={[initialCenter.lat, initialCenter.lng]}
          zoom={value.features.length ? 13 : 4}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> colaboradores'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <DrawControl
            initialValue={value}
            onChange={onChange}
            onMeasurement={setMeasurement}
            onSelectFeature={setSelectedLayer}
            groupRef={groupRef}
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
      <p className="text-2xs text-gray-400">Marque pontos, linhas (trilhas) e polígonos — o primeiro polígono desenhado vira o contorno principal do território. Clique numa feição pra editar atributos ou excluir.</p>
    </div>
  );
}
