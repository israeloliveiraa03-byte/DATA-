// Gera src/components/layout/brazil-states-paths.ts a partir da malha oficial
// de UFs do IBGE já versionada em public/geo/brasil-estados.json.
// Uso: node scripts/gerar-estados-svg.mjs
// Saída: um path SVG por UF (projeção equiretangular com correção de
// latitude média, ~1 a cada 3 vértices, anéis minúsculos descartados).
// Rodar de novo só se a malha mudar — não faz parte do build.
import { readFileSync, writeFileSync } from "node:fs";

const CODAREA_TO_SIGLA = {
  11: "RO", 12: "AC", 13: "AM", 14: "RR", 15: "PA", 16: "AP", 17: "TO",
  21: "MA", 22: "PI", 23: "CE", 24: "RN", 25: "PB", 26: "PE", 27: "AL", 28: "SE", 29: "BA",
  31: "MG", 32: "ES", 33: "RJ", 35: "SP", 41: "PR", 42: "SC", 43: "RS",
  50: "MS", 51: "MT", 52: "GO", 53: "DF",
};

const geo = JSON.parse(readFileSync(new URL("../public/geo/brasil-estados.json", import.meta.url), "utf8"));

let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
const rings = f => (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates);
for (const f of geo.features) for (const poly of rings(f)) for (const [lon, lat] of poly[0]) {
  minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon);
  minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
}
const k = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
const W = 500;
const scale = W / ((maxLon - minLon) * k);
const H = Math.round((maxLat - minLat) * scale);
const px = ([lon, lat]) => [((lon - minLon) * k * scale).toFixed(1), ((maxLat - lat) * scale).toFixed(1)];

const out = {};
const centroids = {};
for (const f of geo.features) {
  const sigla = CODAREA_TO_SIGLA[Number(f.properties.codarea)];
  if (!sigla) continue;
  let d = "";
  let best = null;
  for (const poly of rings(f)) {
    const ring = poly[0];
    if (ring.length < 12 && f.geometry.type === "MultiPolygon") continue;
    const step = ring.length > 300 ? 3 : ring.length > 80 ? 2 : 1;
    const pts = ring.filter((_, i) => i % step === 0).map(px);
    d += "M" + pts.map(p => p.join(" ")).join("L") + "Z";
    if (!best || ring.length > best.length) best = ring;
  }
  out[sigla] = d;
  const [sx, sy] = best.reduce(([a, b], [lon, lat]) => [a + lon, b + lat], [0, 0]);
  centroids[sigla] = px([sx / best.length, sy / best.length]).map(Number);
}

const file = `// Gerado por scripts/gerar-estados-svg.mjs a partir da malha oficial do IBGE
// (public/geo/brasil-estados.json). Não editar à mão.
export const BRAZIL_STATES_VIEWBOX = "0 0 ${W} ${H}";
export const BRAZIL_STATES: Record<string, string> = ${JSON.stringify(out, null, 0)};
export const BRAZIL_STATE_CENTROIDS: Record<string, [number, number]> = ${JSON.stringify(centroids)};
`;
writeFileSync(new URL("../src/components/layout/brazil-states-paths.ts", import.meta.url), file);
console.log(`ok — ${Object.keys(out).length} UFs, viewBox 0 0 ${W} ${H}, ${(file.length / 1024).toFixed(0)} KB`);
