"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";

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

function extractPoints(group: L.FeatureGroup): LatLngPoint[] {
  const points: LatLngPoint[] = [];
  group.eachLayer(layer => {
    if (layer instanceof L.Polygon) {
      const ring = (layer.getLatLngs()[0] as L.LatLng[]);
      ring.forEach(ll => points.push({ lat: ll.lat, lng: ll.lng }));
    }
  });
  return points;
}

interface DrawControlProps {
  value: LatLngPoint[];
  onChange: (points: LatLngPoint[]) => void;
}

// Só permite um polígono por entidade: ao criar um novo, o anterior é substituído.
function DrawControl({ value, onChange }: DrawControlProps) {
  const map = useMap();
  const initialValue = useRef(value);

  useEffect(() => {
    const group = new L.FeatureGroup();
    map.addLayer(group);

    if (initialValue.current.length >= 3) {
      const polygon = L.polygon(initialValue.current.map(p => [p.lat, p.lng] as [number, number]));
      group.addLayer(polygon);
      map.fitBounds(polygon.getBounds(), { maxZoom: 15 });
    }

    const drawControl = new L.Control.Draw({
      draw: {
        polygon: { allowIntersection: false, showArea: true },
        marker: false, circlemarker: false, circle: false, rectangle: false, polyline: false,
      },
      edit: { featureGroup: group, remove: true },
    });
    map.addControl(drawControl);

    function handleCreated(e: L.DrawEvents.Created) {
      group.clearLayers();
      group.addLayer(e.layer);
      onChange(extractPoints(group));
    }
    function handleEdited() { onChange(extractPoints(group)); }
    function handleDeleted() { onChange(extractPoints(group)); }

    map.on(L.Draw.Event.CREATED, handleCreated as L.LeafletEventHandlerFn);
    map.on(L.Draw.Event.EDITED, handleEdited);
    map.on(L.Draw.Event.DELETED, handleDeleted);

    return () => {
      map.off(L.Draw.Event.CREATED, handleCreated as L.LeafletEventHandlerFn);
      map.off(L.Draw.Event.EDITED, handleEdited);
      map.off(L.Draw.Event.DELETED, handleDeleted);
      map.removeControl(drawControl);
      map.removeLayer(group);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return null;
}

interface PolygonMapEditorProps {
  value: LatLngPoint[];
  onChange: (points: LatLngPoint[]) => void;
  center?: LatLngPoint;
}

export function PolygonMapEditor({ value, onChange, center }: PolygonMapEditorProps) {
  const initialCenter = center ?? value[0] ?? BRAZIL_CENTER;

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200" style={{ height: 360 }}>
      <MapContainer
        center={[initialCenter.lat, initialCenter.lng]}
        zoom={value.length ? 13 : 4}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> colaboradores'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <DrawControl value={value} onChange={onChange} />
      </MapContainer>
    </div>
  );
}
