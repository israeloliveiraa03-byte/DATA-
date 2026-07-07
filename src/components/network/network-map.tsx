"use client";

import { useEffect } from "react";
import { MapContainer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { BasemapLayers, ScrollZoomOnFocus } from "@/components/dashboard/widgets/map-common";
import type { NetworkMapPin } from "@/lib/network/build-network-map";

const BRAZIL_CENTER: [number, number] = [-14.235, -51.9253];

const TYPE_ICON: Record<string, string> = {
  territorio: "map", comunidade: "users", escola: "school", associacao: "building-community",
  projeto: "clipboard-list", documento: "file-text", regiao_administrativa: "map-2", pessoa: "user",
};

function pinIcon(type: string, hasOpenCall: boolean) {
  const color = hasOpenCall ? "#c17a3d" : "#3f5977";
  const pulse = hasOpenCall ? `<span style="position:absolute;inset:-4px;border-radius:50%;border:2px solid ${color};animation:network-pulse 1.6s ease-out infinite;"></span>` : "";
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:26px;height:26px;">
      ${pulse}
      <div style="width:26px;height:26px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,0.35);border:1.5px solid #fff;">
        <i class="ti ti-${TYPE_ICON[type] || "map-pin"}" style="color:#fff;font-size:13px;"></i>
      </div>
    </div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function FitToPins({ pins }: { pins: NetworkMapPin[] }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => {
      map.invalidateSize();
      if (pins.length === 0) return;
      if (pins.length === 1) { map.setView([pins[0].lat, pins[0].lng], 9); return; }
      map.fitBounds(pins.map(p => [p.lat, p.lng] as [number, number]), { padding: [32, 32] });
    }, 150);
    return () => clearTimeout(t);
  }, [map, pins]);
  return null;
}

export function NetworkMap({ pins }: { pins: NetworkMapPin[] }) {
  return (
    <div className="h-full w-full rounded-lg overflow-hidden">
      <style>{"@keyframes network-pulse { 0% { transform: scale(0.8); opacity: 1; } 100% { transform: scale(1.6); opacity: 0; } }"}</style>
      <MapContainer center={BRAZIL_CENTER} zoom={4} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <BasemapLayers />
        <ScrollZoomOnFocus />
        <FitToPins pins={pins} />
        {pins.map(pin => (
          <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={pinIcon(pin.type, pin.hasOpenCall)}>
            <Popup>
              <div style={{ minWidth: "200px" }}>
                <p style={{ fontWeight: 700, fontSize: "13px", marginBottom: "2px" }}>{pin.name}</p>
                <p style={{ fontFamily: "monospace", fontSize: "11px", color: "#888", marginBottom: "6px" }}>{pin.code}</p>
                {pin.researches.length > 0 && (
                  <div style={{ marginBottom: "6px" }}>
                    {pin.researches.map(r => (
                      <Link key={r.id} href={`/researches/${r.id}`} style={{ display: "block", fontSize: "12px", color: "#3f5977", fontWeight: 600 }}>
                        {r.title}
                      </Link>
                    ))}
                  </div>
                )}
                {pin.hasOpenCall && (
                  <Link href="/colaboracao" style={{ display: "inline-block", fontSize: "11px", fontWeight: 700, background: "#c17a3d", color: "#fff", padding: "3px 8px", borderRadius: "99px" }}>
                    busca colaborador →
                  </Link>
                )}
                <Link href={`/entidades/${pin.id}`} style={{ display: "block", fontSize: "11px", marginTop: "6px", color: "#3f5977" }}>
                  Ver entidade →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
