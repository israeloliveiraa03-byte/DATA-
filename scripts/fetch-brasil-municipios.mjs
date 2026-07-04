// Baixa a malha oficial do IBGE (municípios, ~5.570 polígonos) e salva como
// asset estático em public/geo/brasil-municipios.json — usado pelo mapa de
// calor do dashboard-builder quando granularity = "city". Reduz casas
// decimais de coordenada (mesma técnica já usada no script do contorno do
// Brasil da tela de login) porque na resolução original o arquivo fica
// grande demais pra carregar num widget. Rodar manualmente:
//   node scripts/fetch-brasil-municipios.mjs
import { writeFileSync } from "node:fs";

const SOURCE_URL = "https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?intrarregiao=municipio&formato=application/vnd.geo+json&qualidade=minima";
const OUT = new URL("../public/geo/brasil-municipios.json", import.meta.url);

// 4 casas decimais ~= 11m de precisão — de sobra pra um choropleth (não é
// mapa de navegação), reduz bastante o tamanho do arquivo final.
const DECIMALS = 4;
function round(n) {
  return Math.round(n * 10 ** DECIMALS) / 10 ** DECIMALS;
}
function simplifyCoords(coords) {
  if (typeof coords[0] === "number") return coords.map(round);
  return coords.map(simplifyCoords);
}

console.log("Baixando malha municipal do IBGE (pode demorar, é um arquivo grande)...");
const res = await fetch(SOURCE_URL);
if (!res.ok) throw new Error(`IBGE respondeu ${res.status}`);
const geojson = await res.json();

if (geojson.type !== "FeatureCollection" || geojson.features.length < 5000) {
  throw new Error(`Malha inesperada: esperava ~5570 municípios, veio ${geojson.type} com ${geojson.features?.length}`);
}

for (const feature of geojson.features) {
  if (feature.geometry?.coordinates) {
    feature.geometry.coordinates = simplifyCoords(feature.geometry.coordinates);
  }
}

const json = JSON.stringify(geojson);
writeFileSync(OUT, json);
console.log(`ok: ${geojson.features.length} municípios salvos em public/geo/brasil-municipios.json (${(json.length / 1024 / 1024).toFixed(2)} MB)`);
