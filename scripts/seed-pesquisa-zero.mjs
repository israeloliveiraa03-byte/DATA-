// Cria uma pesquisa de teste ("Pesquisa Zero") com um instrumento cobrindo
// os tipos de campo funcionais e 100 respostas sintéticas, pra testar o
// dashboard-builder (incluindo os widgets de mapa) com volume de dado real.
// Rodar manualmente: node scripts/seed-pesquisa-zero.mjs
import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);
const uuid = () => crypto.randomUUID();

// Dono da pesquisa: mesmo dono das pesquisas já existentes na conta.
const OWNER_ID = "0bdac316-813b-4630-a3c7-10ff0a8fc1d9";

const STATES = [
  { sigla: "BA", regiao: "Nordeste",    lat: -12.579, lng: -41.701, peso: 18, racismo: 0.35 },
  { sigla: "MA", regiao: "Nordeste",    lat: -5.425,  lng: -45.439, peso: 14, racismo: 0.50 },
  { sigla: "PA", regiao: "Norte",       lat: -3.416,  lng: -52.359, peso: 12, racismo: 0.55 },
  { sigla: "MG", regiao: "Sudeste",     lat: -18.512, lng: -44.555, peso: 10, racismo: 0.25 },
  { sigla: "PE", regiao: "Nordeste",    lat: -8.284,  lng: -40.312, peso: 9,  racismo: 0.40 },
  { sigla: "SP", regiao: "Sudeste",     lat: -22.000, lng: -48.986, peso: 8,  racismo: 0.15 },
  { sigla: "PI", regiao: "Nordeste",    lat: -6.876,  lng: -42.735, peso: 7,  racismo: 0.45 },
  { sigla: "AL", regiao: "Nordeste",    lat: -9.571,  lng: -36.782, peso: 6,  racismo: 0.30 },
  { sigla: "RJ", regiao: "Sudeste",     lat: -22.200, lng: -42.867, peso: 5,  racismo: 0.20 },
  { sigla: "ES", regiao: "Sudeste",     lat: -19.183, lng: -40.308, peso: 4,  racismo: 0.30 },
  { sigla: "SE", regiao: "Nordeste",    lat: -10.574, lng: -37.201, peso: 4,  racismo: 0.35 },
  { sigla: "GO", regiao: "Centro-Oeste",lat: -15.934, lng: -50.143, peso: 3,  racismo: 0.20 },
];
const STATE_POOL = STATES.flatMap(s => Array(s.peso).fill(s)); // pool ponderado, soma 100

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randDate(daysAgoMax) {
  const d = new Date();
  d.setDate(d.getDate() - randInt(0, daysAgoMax));
  return d;
}
function isoDate(d) { return d.toISOString().slice(0, 10); }

const COMUNIDADES = ["Boa Esperança", "Santa Fé", "Nova Aliança", "São Benedito", "Bom Jesus", "Sítio Velho", "Barra do Rio", "Alto Bonito", "Vista Alegre", "Mata Escura"];

const FIELDS = [
  { id: uuid(), type: "short_text",  label: "Nome da comunidade/território", config: {} },
  { id: uuid(), type: "long_text",   label: "Descrição da situação atual da comunidade", config: {} },
  { id: uuid(), type: "number",      label: "Número de famílias residentes", config: {} },
  { id: uuid(), type: "email",       label: "E-mail de contato da liderança", config: {} },
  { id: uuid(), type: "phone",       label: "Telefone de contato", config: {} },
  { id: uuid(), type: "cpf_cnpj",    label: "CPF do respondente", config: {} },
  { id: uuid(), type: "cep",         label: "CEP da sede comunitária", config: {} },
  { id: uuid(), type: "date",        label: "Data da visita de campo", config: {} },
  { id: uuid(), type: "time",        label: "Horário da coleta", config: {} },
  { id: uuid(), type: "date_range",  label: "Período de referência dos dados", config: {} },
  { id: uuid(), type: "single_choice", label: "Estado de conservação das moradias",
    config: { options: [{ id: "bom", label: "Bom" }, { id: "regular", label: "Regular" }, { id: "ruim", label: "Ruim" }] } },
  { id: uuid(), type: "multiple_choice", label: "Infraestrutura disponível na comunidade",
    config: { options: [{ id: "agua", label: "Água encanada" }, { id: "energia", label: "Energia elétrica" }, { id: "internet", label: "Internet" }, { id: "estrada", label: "Estrada de acesso" }, { id: "escola", label: "Escola" }] } },
  { id: uuid(), type: "yes_no",      label: "Há relato de racismo na comunidade?", config: {} },
  { id: uuid(), type: "weighted",    label: "Nível de organização comunitária",
    config: { options: [{ id: "alta", label: "Alta", weight: 3 }, { id: "media", label: "Média", weight: 2 }, { id: "baixa", label: "Baixa", weight: 1 }] } },
  { id: uuid(), type: "consent",     label: "Autoriza uso dos dados para pesquisa (LGPD)?",
    config: { options: [{ id: "sim", label: "Sim" }, { id: "nao", label: "Não" }] } },
  { id: uuid(), type: "scale",       label: "Nível de satisfação com políticas públicas", config: { min: 1, max: 5 } },
  { id: uuid(), type: "stars",       label: "Avaliação da escola local", config: { max: 5 } },
  { id: uuid(), type: "nps",         label: "Recomendaria o programa Dataº Território?", config: {} },
  { id: uuid(), type: "slider",      label: "Percentual estimado de acesso à água tratada", config: { min: 0, max: 100 } },
  { id: uuid(), type: "semantic_scale", label: "Qualidade do ensino oferecido",
    config: { semanticLeft: "Ruim", semanticRight: "Ótimo" } },
  { id: uuid(), type: "ranking",     label: "Prioridades da comunidade",
    config: { rankingItems: ["Saúde", "Educação", "Saneamento", "Segurança fundiária", "Renda"] } },
  { id: uuid(), type: "points_distribution", label: "Distribuição ideal de investimento (100 pontos)",
    config: { totalPoints: 100, options: [{ id: "infra", label: "Infraestrutura" }, { id: "edu", label: "Educação" }, { id: "saude", label: "Saúde" }, { id: "cultura", label: "Cultura" }] } },
  { id: uuid(), type: "card_sorting", label: "Classificação de prioridades por prazo",
    config: { cardCategories: ["Urgente", "Médio prazo", "Longo prazo"], cardItems: ["Poço artesiano", "Posto de saúde", "Reforma escolar", "Estrada", "Documentação fundiária"] } },
  { id: uuid(), type: "geo_region",  label: "Região", config: {} },
  { id: uuid(), type: "geo_state",   label: "Estado", config: {} },
  { id: uuid(), type: "geo_city",    label: "Município", config: {} },
  { id: uuid(), type: "geo_zone",    label: "Zona", config: { zoneOptions: ["Urbana", "Rural", "Ribeirinha"] } },
  { id: uuid(), type: "geo_coords",  label: "Coordenadas GPS da sede", config: {} },
  { id: uuid(), type: "matrix",      label: "Acesso a serviços básicos",
    config: { matrixRows: ["Água", "Energia", "Saneamento", "Internet"], matrixCols: ["Sim", "Parcial", "Não"] } },
  { id: uuid(), type: "observation", label: "Situação de segurança e transporte",
    config: { matrixRows: ["Segurança", "Transporte escolar"], matrixCols: ["Sim", "Não", "Não sei"] } },
].map((f, i) => ({ ...f, order: i }));

function generateResponseData(state) {
  const byType = (type) => FIELDS.find(x => x.type === type);
  const data = {};

  data[byType("short_text").id] = `Comunidade ${pick(COMUNIDADES)}`;
  data[byType("long_text").id] = "Levantamento de campo realizado com a liderança local, cobrindo infraestrutura, educação e saúde.";
  data[byType("number").id] = randInt(8, 220);
  data[byType("email").id] = "contato@exemplo-teste.org";
  data[byType("phone").id] = `(${randInt(11, 99)}) 9${randInt(1000, 9999)}-${randInt(1000, 9999)}`;
  data[byType("cpf_cnpj").id] = `${randInt(100, 999)}.${randInt(100, 999)}.${randInt(100, 999)}-${randInt(10, 99)}`;
  data[byType("cep").id] = `${randInt(10000, 99999)}-${randInt(100, 999)}`;
  data[byType("date").id] = isoDate(randDate(600));
  data[byType("time").id] = `${String(randInt(7, 17)).padStart(2, "0")}:${pick(["00", "15", "30", "45"])}`;
  { const start = randDate(600); const end = new Date(start); end.setDate(end.getDate() + randInt(10, 90));
    data[byType("date_range").id] = { start: isoDate(start), end: isoDate(end) }; }
  data[byType("single_choice").id] = pick(["bom", "regular", "ruim"]);
  { const opts = ["agua", "energia", "internet", "estrada", "escola"];
    data[byType("multiple_choice").id] = opts.filter(() => Math.random() < 0.5); }
  data[byType("yes_no").id] = Math.random() < state.racismo ? "Sim" : "Não";
  data[byType("weighted").id] = pick(["alta", "media", "baixa"]);
  data[byType("consent").id] = Math.random() < 0.9 ? "sim" : "nao";
  data[byType("scale").id] = randInt(1, 5);
  data[byType("stars").id] = randInt(2, 5);
  data[byType("nps").id] = randInt(0, 10);
  data[byType("slider").id] = randInt(0, 100);
  data[byType("semantic_scale").id] = randInt(1, 5);
  { const items = ["Saúde", "Educação", "Saneamento", "Segurança fundiária", "Renda"];
    data[byType("ranking").id] = [...items].sort(() => Math.random() - 0.5); }
  { let remaining = 100; const opts = ["infra", "edu", "saude", "cultura"]; const dist = {};
    opts.forEach((o, i) => { const v = i === opts.length - 1 ? remaining : randInt(0, remaining); dist[o] = v; remaining -= v; });
    data[byType("points_distribution").id] = dist; }
  { const cats = ["Urgente", "Médio prazo", "Longo prazo"]; const items = ["Poço artesiano", "Posto de saúde", "Reforma escolar", "Estrada", "Documentação fundiária"];
    data[byType("card_sorting").id] = Object.fromEntries(items.map(it => [it, pick(cats)])); }
  data[byType("geo_region").id] = state.regiao;
  data[byType("geo_state").id] = state.sigla;
  data[byType("geo_city").id] = `Sede ${pick(COMUNIDADES)}`;
  data[byType("geo_zone").id] = pick(["Urbana", "Rural", "Ribeirinha"]);
  { const lat = state.lat + (Math.random() - 0.5) * 2.6; const lng = state.lng + (Math.random() - 0.5) * 2.6;
    data[byType("geo_coords").id] = `${lat.toFixed(6)}, ${lng.toFixed(6)}`; }
  { const rows = ["Água", "Energia", "Saneamento", "Internet"]; const cols = ["Sim", "Parcial", "Não"];
    data[byType("matrix").id] = Object.fromEntries(rows.map(r => [r, pick(cols)])); }
  { const rows = ["Segurança", "Transporte escolar"]; const cols = ["Sim", "Não", "Não sei"];
    data[byType("observation").id] = Object.fromEntries(rows.map(r => [r, pick(cols)])); }

  return data;
}

async function main() {
  const researchId = uuid();
  const formId = uuid();

  await sql`
    INSERT INTO researches (id, owner_id, title, description, slug, status, theme, allow_anonymous, collect_gps, offline_enabled, public_dashboard)
    VALUES (${researchId}, ${OWNER_ID}, 'Pesquisa Zero',
      'Pesquisa de teste com dado sintético (100 respostas) — usada pra validar o dashboard-builder, incluindo os widgets de mapa. Pode ser apagada quando quiser.',
      'pesquisa-zero', 'active', 'territory', true, true, true, false)
  `;

  await sql`
    INSERT INTO forms (id, research_id, title, description, schema, is_active, version)
    VALUES (${formId}, ${researchId}, 'Instrumento de teste — Pesquisa Zero', 'Cobre os tipos de campo funcionais do sistema', '{}', true, 1)
  `;

  for (const field of FIELDS) {
    await sql`
      INSERT INTO form_fields (id, form_id, type, label, "order", config)
      VALUES (${field.id}, ${formId}, ${field.type}, ${field.label}, ${field.order}, ${JSON.stringify(field.config)})
    `;
  }
  console.log(`ok: ${FIELDS.length} campos criados`);

  for (let i = 0; i < 100; i++) {
    const state = pick(STATE_POOL);
    const data = generateResponseData(state);
    const submittedAt = randDate(180);
    await sql`
      INSERT INTO responses (id, form_id, research_id, data, completed, submitted_at, created_at)
      VALUES (${uuid()}, ${formId}, ${researchId}, ${JSON.stringify(data)}, true, ${submittedAt.toISOString()}, ${submittedAt.toISOString()})
    `;
    if ((i + 1) % 20 === 0) console.log(`  ${i + 1}/100 respostas...`);
  }

  console.log(`ok: Pesquisa Zero criada — id=${researchId} slug=pesquisa-zero, 100 respostas`);
}

main();
