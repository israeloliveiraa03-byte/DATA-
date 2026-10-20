import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

// ─── Blocos de página do sistema "Confluência" ─────────────────────────────
// Toda tela da plataforma monta com estas peças, para que título, rótulo,
// largura e ritmo vertical sejam sempre os mesmos.

export function PageContainer({ children, className, width = "default" }: { children: ReactNode; className?: string; width?: "default" | "narrow" | "wide" }) {
  return (
    <div className={cn(
      "mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8",
      width === "narrow" ? "max-w-3xl" : width === "wide" ? "max-w-[1440px]" : "max-w-page",
      className,
    )}>
      {children}
    </div>
  );
}

export interface Crumb { label: string; href?: string }

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="Trilha de navegação" className="mb-3">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-ink-500">
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-1 min-w-0">
            {i > 0 && <i className="ti ti-chevron-right text-[10px] text-ink-600" aria-hidden="true" />}
            {c.href ? (
              <Link href={c.href} className="hover:text-ink-100 transition-colors truncate max-w-[16rem]">{c.label}</Link>
            ) : (
              <span className="text-ink-300 truncate max-w-[20rem]" aria-current="page">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHeader({
  kicker, title, description, actions, breadcrumbs, meta, className,
}: {
  kicker?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: Crumb[];
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-7 sm:mb-8", className)}>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {kicker && <p className="kicker mb-2">{kicker}</p>}
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-ink-50 leading-tight">{title}</h1>
          {description && <p className="mt-2 text-base text-ink-300 max-w-prose">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
      {meta && (
        <div className="mt-5 pt-4 border-t border-ink-700 flex flex-wrap gap-x-8 gap-y-2 text-sm text-ink-500">{meta}</div>
      )}
    </header>
  );
}

export function SectionHeader({ kicker, title, description, action, className }: {
  kicker?: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3 mb-4", className)}>
      <div className="min-w-0">
        {kicker && <p className="kicker mb-1.5">{kicker}</p>}
        <h2 className="font-serif text-xl font-semibold text-ink-50 leading-snug">{title}</h2>
        {description && <p className="mt-1 text-sm text-ink-300 max-w-prose">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export interface StatItem { label: string; value: ReactNode; note?: ReactNode; icon?: string; tone?: "brand" | "teal" | "amber" | "coral" | "ink" }

const toneText: Record<NonNullable<StatItem["tone"]>, string> = {
  brand: "text-brand-400", teal: "text-teal-600", amber: "text-amber-600", coral: "text-coral-600", ink: "text-ink-50",
};

/** Indicadores com divisórias de 1px — padrão dos painéis CONAQ. */
export function StatGrid({ items, className }: { items: StatItem[]; className?: string }) {
  return (
    <div className={cn("stat-grid grid-cols-2", items.length >= 4 ? "lg:grid-cols-4" : items.length === 3 ? "sm:grid-cols-3" : "", className)}>
      {items.map(s => (
        <div key={s.label} className="px-5 py-5 sm:py-6">
          <div className="flex items-center justify-between gap-2 mb-3">
            <p className="kicker-plain">{s.label}</p>
            {s.icon && <i className={cn("ti", s.icon, "text-base text-ink-500")} aria-hidden="true" />}
          </div>
          <p className={cn("font-serif text-3xl sm:text-4xl font-semibold leading-none tabular", toneText[s.tone ?? "brand"])}>{s.value}</p>
          {s.note && <p className="mt-2 text-xs text-ink-500 italic">{s.note}</p>}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon = "ti-inbox", title, description, action, className }: {
  icon?: string; title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center text-center px-6 py-14 rounded-xl border border-dashed border-ink-600 bg-ink-900/60", className)}>
      <div className="w-12 h-12 rounded-full bg-brand-50 text-brand-400 flex items-center justify-center mb-4">
        <i className={cn("ti", icon, "text-2xl")} aria-hidden="true" />
      </div>
      <p className="font-serif text-lg font-semibold text-ink-50">{title}</p>
      {description && <p className="mt-1 text-sm text-ink-300 max-w-md">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Caixa de nota editorial ("Como ler", "Nota metodológica", "Cuidado na leitura"). */
export function Callout({ title, children, tone = "note", icon, className }: {
  title?: ReactNode; children: ReactNode; tone?: "note" | "warn" | "info"; icon?: string; className?: string;
}) {
  const tones = {
    note: "bg-ink-800/60 border-ink-700 text-ink-300",
    warn: "bg-amber-50 border-amber-500/40 text-amber-600",
    info: "bg-brand-50 border-brand-500/25 text-brand-400",
  } as const;
  return (
    <div className={cn("rounded-lg border px-4 py-3 text-sm flex gap-3", tones[tone], className)}>
      {icon && <i className={cn("ti", icon, "text-lg flex-shrink-0 mt-0.5")} aria-hidden="true" />}
      <div className="min-w-0">
        {title && <p className="text-2xs font-bold uppercase tracking-[0.1em] mb-1">{title}</p>}
        <div className="leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
