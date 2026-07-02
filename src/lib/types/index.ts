import type { InferSelectModel } from "drizzle-orm";
import type { users, organizations, researches, forms, formFields, responses, dashboards, dashboardWidgets, entities, entityVersions, researchEntities } from "@/lib/db/schema";

export type User         = InferSelectModel<typeof users>;
export type Organization = InferSelectModel<typeof organizations>;
export type Research     = InferSelectModel<typeof researches>;
export type Form         = InferSelectModel<typeof forms>;
export type FormField    = InferSelectModel<typeof formFields>;
export type Response     = InferSelectModel<typeof responses>;
export type Dashboard    = InferSelectModel<typeof dashboards>;
export type Widget       = InferSelectModel<typeof dashboardWidgets>;
export type Entity         = InferSelectModel<typeof entities>;
export type EntityVersion  = InferSelectModel<typeof entityVersions>;
export type ResearchEntity = InferSelectModel<typeof researchEntities>;

export type FieldType = "short_text"|"long_text"|"number"|"single_choice"|"multiple_choice"|"scale"|"date"|"location"|"image"|"file"|"section"|"matrix";

export interface FieldConfig {
  options?:    Array<{ value: string; label: string }>;
  min?:        number;
  max?:        number;
  step?:       number;
  minLength?:  number;
  maxLength?:  number;
  mask?:       string;
  matrixRows?: string[];
  matrixCols?: string[];
}

export interface IBGEState { id: number; nome: string; sigla: string; }
export interface IBGECity  { id: number; nome: string; }

export interface OfflineResponse {
  id: string; formId: string; researchId: string;
  data: Record<string, unknown>; createdAt: string; synced: boolean;
}

export type WSEventType = "response:new"|"response:updated"|"indicator:updated"|"research:status_changed";
export interface WSEvent<T = unknown> { type: WSEventType; researchId: string; payload: T; timestamp: string; }

export interface ApiSuccess<T> { success: true; data: T; }
export interface ApiError { success: false; error: string; code?: string; }
export type ApiResponse<T> = ApiSuccess<T> | ApiError;
