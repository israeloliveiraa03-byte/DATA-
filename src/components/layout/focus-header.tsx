"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { DataLogo } from "@/components/layout/data-logo";

// Cabeçalho dos editores em "modo foco" (instrumento e painel): voltar para a
// pesquisa, contexto, título editável, estado de salvamento e ações.
export function FocusHeader({
  backHref, backLabel, context, title, onTitleChange, titleLabel, status, actions,
}: {
  backHref: string;
  backLabel: string;
  context: ReactNode;
  title: string;
  onTitleChange: (v: string) => void;
  titleLabel: string;
  status?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="h-14 flex-shrink-0 z-50 flex items-center gap-2 sm:gap-3 px-2 sm:px-4 border-b border-ink-700 bg-ink-900">
      <Link href={backHref} aria-label={backLabel} title={backLabel}
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md text-ink-300 hover:bg-ink-800 hover:text-ink-50 transition-colors">
        <i className="ti ti-arrow-left text-lg" aria-hidden="true" />
      </Link>
      <Link href="/dashboard" className="hidden md:block flex-shrink-0 text-ink-50" aria-label="Dataº — início">
        <DataLogo className="text-lg" animated={false} />
      </Link>
      <span className="hidden md:block h-6 w-px bg-ink-700 flex-shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-ink-500 truncate">{context}</p>
        <input
          value={title}
          onChange={e => onTitleChange(e.target.value)}
          aria-label={titleLabel}
          className="block w-full max-w-xl truncate rounded border-0 bg-transparent px-0 py-0 text-sm sm:text-base font-semibold text-ink-50 focus:outline-none focus:ring-0 hover:bg-ink-800/60 focus:bg-ink-800/60"
        />
      </div>
      {status && <div className="hidden sm:flex items-center gap-1.5 text-xs text-ink-500 flex-shrink-0" aria-live="polite">{status}</div>}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">{actions}</div>
    </header>
  );
}
