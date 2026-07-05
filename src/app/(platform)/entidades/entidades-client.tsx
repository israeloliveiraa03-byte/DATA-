"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Entity } from "@/lib/types";

const TYPE_MAP: Record<string, { label: string; icon: string }> = {
  territorio:             { label: "Território",             icon: "ti-map" },
  comunidade:             { label: "Comunidade",              icon: "ti-users" },
  regiao_administrativa:  { label: "Região administrativa",   icon: "ti-map-2" },
  escola:                 { label: "Escola",                  icon: "ti-school" },
  associacao:             { label: "Associação",               icon: "ti-building-community" },
  projeto:                { label: "Projeto",                  icon: "ti-clipboard-list" },
  pessoa:                 { label: "Pessoa",                   icon: "ti-user" },
  documento:              { label: "Documento",                icon: "ti-file-text" },
};

const STATUS_MAP: Record<string, { label: string; variant: "default"|"teal"|"amber" }> = {
  draft:     { label: "Rascunho",  variant: "default" },
  published: { label: "Publicada", variant: "teal" },
  archived:  { label: "Arquivada", variant: "amber" },
};

export function EntidadesClient({ entities }: { entities: Entity[] }) {
  return (
    <div className="flex-1 overflow-auto bg-ink-950">
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest font-condensed text-brand-400 mb-1">Catálogo Global</p>
            <h1 className="text-2xl font-bold font-condensed text-ink-100">Entidades</h1>
            <p className="text-sm text-ink-300 mt-0.5">
              {entities.length} {entities.length === 1 ? "entidade cadastrada" : "entidades cadastradas"}
            </p>
          </div>
          <Link href="/entidades/nova">
            <Button>
              <i className="ti ti-plus" /> Nova entidade
            </Button>
          </Link>
        </div>

        {entities.length === 0 ? (
          <div className="text-center py-20 rounded-lg border-2 border-dashed border-ink-700 bg-ink-900">
            <i className="ti ti-database text-4xl block mb-3 text-ink-500" aria-hidden="true" />
            <p className="text-sm font-semibold text-ink-100 mb-1">Nenhuma entidade ainda</p>
            <p className="text-xs text-ink-300 mb-5">
              Cadastre territórios, comunidades, escolas e outras entidades para compartilhar conhecimento entre pesquisas.
            </p>
            <Link href="/entidades/nova">
              <Button>
                <i className="ti ti-plus" /> Cadastrar primeira entidade
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {entities.map(entity => {
              const t = TYPE_MAP[entity.type] ?? { label: entity.type, icon: "ti-tag" };
              const s = STATUS_MAP[entity.status] ?? STATUS_MAP.draft;
              return (
                <Link key={entity.id} href={`/entidades/${entity.id}`}>
                  <Card hoverable className="p-4 h-full">
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="blue"><i className={`ti ${t.icon}`} /> {t.label}</Badge>
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </div>
                    <h3 className="text-sm font-bold text-ink-100 mb-1 line-clamp-2">{entity.name}</h3>
                    <p className="text-xs text-ink-300 font-mono mb-2">{entity.code}</p>
                    {entity.cityName && (
                      <p className="text-xs text-ink-300 flex items-center gap-1">
                        <i className="ti ti-map-pin text-xs text-brand-400" aria-hidden="true" />
                        {entity.cityName}{entity.stateCode ? ` — ${entity.stateCode}` : ""}
                      </p>
                    )}
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
