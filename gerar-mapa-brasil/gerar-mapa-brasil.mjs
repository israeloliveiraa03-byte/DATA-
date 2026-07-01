// gerar-mapa-brasil.mjs
// Baixa a malha oficial do Brasil (IBGE) e gera um SVG limpo do contorno.
// Uso: node gerar-mapa-brasil.mjs
// Requer Node 18+ (tem fetch nativo).

import fs from "fs";

const URL = "https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo+json&qualidade=intermediaria";

// Dimensões do viewBox de saída
const W = 500, H = 520, PAD = 20;

function collectRings(geometry) {
  const rings = [];
  if (!geometry) return rings;
  if (geometry.type === "Polygon") {
    geometry.coordinates.forEach(r => rings.push(r));
  } else if (geometry.type === "MultiPolygon") {
    geometry.coordinates.forEach(poly => poly.forEach(r => rings.push(r)));
  }
  return rings;
}

const res = await fetch(URL);
const geo = await res.json();

// Coleta todos os anéis de todas as features
let rings = [];
const features = geo.features ?? [geo];
for (const f of features) rings = rings.concat(collectRings(f.geometry));

// Bounding box
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
for (const ring of rings) for (const [x, y] of ring) {
  if (x < minX) minX = x; if (x > maxX) maxX = x;
  if (y < minY) minY = y; if (y > maxY) maxY = y;
}

const spanX = maxX - minX, spanY = maxY - minY;
const scale = Math.min((W - PAD * 2) / spanX, (H - PAD * 2) / spanY);
const offX = (W - spanX * scale) / 2;
const offY = (H - spanY * scale) / 2;

// Projeta (lon,lat) -> (x,y) do SVG. Y invertido (lat cresce pra cima).
const px = x => offX + (x - minX) * scale;
const py = y => offY + (maxY - y) * scale;

// Descarta anéis pequenos (ilhotas/ruído da malha) e simplifica: mantém 1 a cada N pontos
const MIN_POINTS = 40;
const STEP = 5;
const paths = rings
  .filter(ring => ring.length >= MIN_POINTS)
  .map(ring => {
    let d = "";
    for (let i = 0; i < ring.length; i += STEP) {
      const [x, y] = ring[i];
      d += (i === 0 ? "M" : "L") + px(x).toFixed(1) + " " + py(y).toFixed(1) + " ";
    }
    return d.trim() + " Z";
  }).join(" ");

// Cor da identidade visual atual (azul brand), não a paleta terrosa antiga
const svg = `<svg viewBox="0 0 ${W} ${H}" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="${paths}" fill="rgba(26,86,219,0.04)" stroke="#1a56db" stroke-width="1.2" stroke-linejoin="round"/>
</svg>`;

fs.writeFileSync("mapa-brasil.svg", svg);
console.log("✅ mapa-brasil.svg gerado! Tamanho:", (svg.length/1024).toFixed(1), "KB");
console.log("Abra o arquivo para conferir o contorno.");
