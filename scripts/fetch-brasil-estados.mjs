// Baixa a malha oficial do IBGE (estados) uma única vez e salva como asset
// estático em public/geo/brasil-estados.json — usado pelo widget de mapa de
// calor do dashboard-builder. Rodar manualmente (não faz parte do build):
//   node scripts/fetch-brasil-estados.mjs
// Ver "Mapa do Brasil" no CLAUDE.md: nunca aproximar a malha à mão, sempre
// partir da fonte oficial do IBGE, e gerar estático pra não depender de rede
// em runtime.
import { writeFileSync } from "node:fs";

const SOURCE_URL = "https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?intrarregiao=UF&formato=application/vnd.geo+json&qualidade=minima";
const OUT = new URL("../public/geo/brasil-estados.json", import.meta.url);

const res = await fetch(SOURCE_URL);
if (!res.ok) throw new Error(`IBGE respondeu ${res.status}`);
const geojson = await res.json();

if (geojson.type !== "FeatureCollection" || geojson.features.length !== 27) {
  throw new Error(`Malha inesperada: esperava FeatureCollection com 27 estados, veio ${geojson.type} com ${geojson.features?.length}`);
}

writeFileSync(OUT, JSON.stringify(geojson));
console.log(`ok: ${geojson.features.length} estados salvos em public/geo/brasil-estados.json`);
