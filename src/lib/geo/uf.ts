// Sigla de UF (o que os campos geo_state gravam nas respostas, ex: "SP") ↔
// código de área do IBGE (o que a malha em public/geo/brasil-estados.json
// usa em properties.codarea, ex: "35"). Fonte: códigos oficiais do IBGE.
export const SIGLA_TO_CODAREA: Record<string, string> = {
  RO: "11", AC: "12", AM: "13", RR: "14", PA: "15", AP: "16", TO: "17",
  MA: "21", PI: "22", CE: "23", RN: "24", PB: "25", PE: "26", AL: "27", SE: "28", BA: "29",
  MG: "31", ES: "32", RJ: "33", SP: "35",
  PR: "41", SC: "42", RS: "43",
  MS: "50", MT: "51", GO: "52", DF: "53",
};

export const CODAREA_TO_SIGLA: Record<string, string> = Object.fromEntries(
  Object.entries(SIGLA_TO_CODAREA).map(([sigla, codarea]) => [codarea, sigla]),
);
