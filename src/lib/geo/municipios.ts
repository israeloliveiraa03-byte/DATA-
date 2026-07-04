import municipiosLookup from "./municipios-lookup.json";

// geo_city grava só o NOME da cidade (não o código IBGE), sempre ao lado de
// um campo geo_state (UF) no mesmo formulário — resolve pro código de 7
// dígitos que a malha municipal usa em properties.codarea. Gerado por
// scripts/fetch-municipios-lookup.mjs.
const LOOKUP = municipiosLookup as Record<string, string>;

export function resolveMunicipioCode(uf: string, cityName: string): string | undefined {
  return LOOKUP[`${uf}|${cityName}`];
}

// Reverso (código → "Nome (UF)") pra legenda/tooltip do mapa municipal — a
// malha (public/geo/brasil-municipios.json) só carrega o codarea, sem nome.
// Construído uma vez, sob demanda (client só chama isso ao passar o mouse).
let reverseLookup: Map<string, string> | null = null;
export function resolveMunicipioName(code: string): string | undefined {
  if (!reverseLookup) {
    reverseLookup = new Map();
    for (const [key, value] of Object.entries(LOOKUP)) {
      const [uf, nome] = key.split("|");
      reverseLookup.set(value, `${nome} (${uf})`);
    }
  }
  return reverseLookup.get(code);
}
