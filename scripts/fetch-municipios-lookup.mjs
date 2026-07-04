// Baixa a lista oficial de municípios do IBGE (nome + UF + código) uma
// única vez e gera uma tabela de consulta estática — usada pra resolver o
// campo geo_city (que grava só o NOME da cidade, sempre ao lado de um
// campo geo_state) pro código de 7 dígitos que a malha municipal usa em
// properties.codarea. Rodar manualmente:
//   node scripts/fetch-municipios-lookup.mjs
import { writeFileSync } from "node:fs";

const SOURCE_URL = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios";
const OUT = new URL("../src/lib/geo/municipios-lookup.json", import.meta.url);

const res = await fetch(SOURCE_URL);
if (!res.ok) throw new Error(`IBGE respondeu ${res.status}`);
const municipios = await res.json();

if (!Array.isArray(municipios) || municipios.length < 5000) {
  throw new Error(`Lista inesperada: esperava ~5570 municípios, veio ${municipios?.length}`);
}

const lookup = {};
for (const m of municipios) {
  const sigla = m.microrregiao?.mesorregiao?.UF?.sigla ?? m["regiao-imediata"]?.["regiao-intermediaria"]?.UF?.sigla;
  if (!sigla || !m.nome || !m.id) continue;
  lookup[`${sigla}|${m.nome}`] = String(m.id);
}

writeFileSync(OUT, JSON.stringify(lookup));
console.log(`ok: ${Object.keys(lookup).length} municípios salvos em src/lib/geo/municipios-lookup.json`);
