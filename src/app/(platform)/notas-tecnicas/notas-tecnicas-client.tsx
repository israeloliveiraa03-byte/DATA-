"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const TYPE_MAP: Record<string, string> = {
  territorio: "Território", comunidade: "Comunidade", escola: "Escola",
  associacao: "Associação", projeto: "Projeto", documento: "Documento",
  regiao_administrativa: "Região administrativa", pessoa: "Pessoa",
};

type Note = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  entityType: string | null;
  entity: { id: string; name: string; code: string } | null;
  author: { id: string; name: string; institution: string | null };
  endorsementCount: number;
  endorsedByMe: boolean;
  createdAt: Date | string;
};

interface Props {
  notes: Note[];
  isLoggedIn: boolean;
}

export function NotasTecnicasClient({ notes: initialNotes, isLoggedIn }: Props) {
  const [notes,      setNotes]      = useState(initialNotes);
  const [typeFilter, setTypeFilter] = useState("all");
  const [search,     setSearch]     = useState("");

  const filtered = useMemo(() => {
    return notes.filter(n => {
      const matchType = typeFilter === "all" || n.entityType === typeFilter;
      const q = search.trim().toLowerCase();
      const matchSearch = !q || n.title.toLowerCase().includes(q) || n.tags.some(t => t.toLowerCase().includes(q));
      return matchType && matchSearch;
    });
  }, [notes, typeFilter, search]);

  async function toggleEndorse(noteId: string) {
    if (!isLoggedIn) return;
    const res = await fetch(`/api/notes/${noteId}/endorse`, { method: "POST" });
    if (!res.ok) return;
    const { data } = await res.json();
    setNotes(prev => prev.map(n => n.id === noteId
      ? { ...n, endorsedByMe: data.endorsed, endorsementCount: n.endorsementCount + (data.endorsed ? 1 : -1) }
      : n));
  }

  return (
    <div className="flex-1 overflow-auto bg-ink-950">
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest font-condensed text-brand-400 mb-1">Rede</p>
          <h1 className="text-2xl font-bold font-condensed text-ink-100">Notas técnicas</h1>
          <p className="text-sm text-ink-300 mt-0.5">
            Orientações metodológicas compartilhadas por pesquisadores — {notes.length} {notes.length === 1 ? "nota pública" : "notas públicas"}.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-md border border-ink-700 bg-ink-900 text-ink-100">
            <option value="all">Todos os tipos</option>
            {Object.entries(TYPE_MAP).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por título ou tag..."
            className="text-xs px-3 py-2 rounded-md border border-ink-700 bg-ink-900 text-ink-100 placeholder:text-ink-500 flex-1 min-w-[200px]" />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 rounded-lg border-2 border-dashed border-ink-700 bg-ink-900">
            <i className="ti ti-notebook text-4xl block mb-3 text-ink-500" aria-hidden="true" />
            <p className="text-sm font-semibold text-ink-100 mb-1">Nenhuma nota encontrada</p>
            <p className="text-xs text-ink-300 mb-5">
              Publique orientações metodológicas na aba &ldquo;Notas técnicas&rdquo; do seu perfil pra compartilhar com a rede.
            </p>
            <Link href="/profile" className="text-xs font-semibold text-brand-400 hover:underline">Ir para o perfil</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(note => (
              <Card key={note.id} className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="text-sm font-bold text-ink-100">{note.title}</h3>
                  {note.entityType && <Badge variant="blue">{TYPE_MAP[note.entityType] ?? note.entityType}</Badge>}
                </div>
                <p className="text-xs text-ink-300 mb-3 line-clamp-3 whitespace-pre-wrap">{note.body}</p>

                {note.entity && (
                  <Link href={`/entidades/${note.entity.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-400 hover:underline mb-3">
                    <i className="ti ti-database" aria-hidden="true" /> {note.entity.name} <span className="font-mono text-ink-500">{note.entity.code}</span>
                  </Link>
                )}

                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {note.tags.map(tag => (
                      <span key={tag} className="text-2xs px-2 py-0.5 rounded-full bg-ink-800 border border-ink-700 text-ink-300">#{tag}</span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-ink-700">
                  <div className="text-xs text-ink-300">
                    <span className="font-semibold text-ink-100">{note.author.name}</span>
                    {note.author.institution && <span> · {note.author.institution}</span>}
                  </div>
                  <button onClick={() => toggleEndorse(note.id)} disabled={!isLoggedIn}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-md transition-colors duration-150 disabled:opacity-50 ${
                      note.endorsedByMe ? "text-brand-400 bg-brand-500/10" : "text-ink-300 hover:text-brand-400"
                    }`}>
                    <i className={`ti ${note.endorsedByMe ? "ti-heart-filled" : "ti-heart"}`} aria-hidden="true" /> {note.endorsementCount}
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
