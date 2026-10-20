import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "blue" | "teal" | "amber" | "red" | "purple" | "brand" | "outline";

interface BadgeProps { children: React.ReactNode; variant?: BadgeVariant; dot?: boolean; className?: string; }

const variants: Record<BadgeVariant, string> = {
  default: "bg-ink-800 text-ink-300 border-ink-700",
  brand:   "bg-brand-50 text-brand-400 border-brand-500/25",
  blue:    "bg-brand-50 text-brand-400 border-brand-500/25",
  teal:    "bg-teal-50 text-teal-600 border-teal-500/25",
  amber:   "bg-amber-50 text-amber-600 border-amber-500/25",
  red:     "bg-coral-50 text-coral-600 border-coral-500/25",
  purple:  "bg-purple-50 text-purple-600 border-purple-500/25",
  outline: "bg-transparent text-ink-300 border-ink-600",
};

const dots: Record<BadgeVariant, string> = {
  default: "bg-ink-500", brand: "bg-brand-500", blue: "bg-brand-500", teal: "bg-teal-500",
  amber: "bg-amber-500", red: "bg-coral-500", purple: "bg-purple-500", outline: "bg-ink-500",
};

export function Badge({ children, variant = "default", dot, className }: BadgeProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-2xs font-semibold whitespace-nowrap", variants[variant], className)}>
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", dots[variant])} aria-hidden="true" />}
      {children}
    </span>
  );
}

export function ResearchStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    draft:     { label: "Rascunho",  variant: "default" },
    active:    { label: "Em coleta", variant: "teal" },
    paused:    { label: "Pausada",   variant: "amber" },
    closed:    { label: "Encerrada", variant: "red" },
    published: { label: "Publicada", variant: "brand" },
  };
  const s = map[status] ?? { label: status, variant: "default" as BadgeVariant };
  return <Badge variant={s.variant} dot>{s.label}</Badge>;
}
