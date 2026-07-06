// Tipos do app de campo — espelham o formato JSON que a API do Dataº devolve
// (datas viram string no JSON, então não dá pra reaproveitar direto os tipos
// InferSelectModel de ../../src/lib/types, que usam Date e puxariam o
// drizzle-orm pro bundle do app).
//
// Fonte de verdade dos tipos de campo: src/lib/db/schema/researches.ts
// (fieldTypeEnum) no projeto principal — manter em sincronia manualmente.

export type FieldType =
  | "short_text" | "long_text" | "number" | "email" | "phone" | "date" | "time"
  | "yes_no" | "single_choice" | "multiple_choice" | "scale" | "stars" | "nps"
  | "slider" | "semantic_scale" | "cpf_cnpj" | "date_range" | "ranking"
  | "points_distribution" | "card_sorting" | "weighted" | "consent" | "geo_zone"
  | "matrix" | "observation" | "signature" | "signature_meta"
  | "geo_region" | "geo_state" | "geo_mesoregion" | "geo_microregion"
  | "geo_city" | "geo_district" | "geo_neighborhood" | "cep" | "geo_coords"
  | "geo_map" | "geo_relational" | "file" | "section" | "conditional"
  | "data_table" | "availability" | string;

export interface ApiResearch {
  id:          string;
  title:       string;
  description: string | null;
  slug:        string;
  status:      string;
  createdAt:   string;
}

export interface ApiFormField {
  id:          string;
  formId:      string;
  type:        FieldType;
  label:       string;
  description: string | null;
  placeholder: string | null;
  required:    boolean;
  order:       number;
  config:      Record<string, unknown> | null;
}

export interface ApiForm {
  id:          string;
  researchId:  string;
  title:       string;
  description: string | null;
  fields:      ApiFormField[];
}

export type AnswerValue =
  | string | string[] | number | boolean
  | Record<string, unknown> | Record<string, unknown>[] | null;

export type Answers = Record<string, AnswerValue>;

export type Opt = { id: string; label: string; weight?: number };

export interface LocalResponse {
  id:           string; // UUID gerado no aparelho — garante idempotência no reenvio
  formId:       string;
  researchId:   string;
  data:         Answers;
  latitude:     string | null;
  longitude:    string | null;
  capturedAt:   string;
  syncStatus:   "pending" | "synced" | "error";
  syncError:    string | null;
}

export interface LocalEntityEdit {
  id:         string;
  entityId:   string;
  entityName: string;
  points:     Array<{ lat: number; lng: number }>;
  capturedAt: string;
  syncStatus: "pending" | "synced" | "error";
  syncError:  string | null;
}

export interface LocalMedia {
  id:         string;
  responseId: string | null;
  fieldId:    string | null;
  // Caminho do arquivo salvo via @capacitor/filesystem no aparelho
  filePath:   string;
  mimeType:   string;
  capturedAt: string;
  syncStatus: "pending" | "synced" | "error";
}

export interface SyncResultItem {
  id:     string;
  status: "created" | "duplicate" | "error";
  error?: string;
}
