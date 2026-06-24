import { cn } from "@/lib/utils";

interface BadgeProps { children: React.ReactNode; variant?: "default"|"blue"|"teal"|"amber"|"red"|"purple"; className?: string; }

const variants = { default: "bg-gray-100 text-gray-600", blue: "bg-brand-50 text-brand-600", teal: "bg-teal-50 text-teal-600", amber: "bg-amber-50 text-amber-700", red: "bg-red-50 text-red-700", purple: "bg-purple-50 text-purple-600" };

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", variants[variant], className)}>{children}</span>;
}

export function ResearchStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
    draft: { label: "Rascunho", variant: "default" }, active: { label: "Ativa", variant: "teal" },
    paused: { label: "Pausada", variant: "amber" }, closed: { label: "Encerrada", variant: "red" },
    published: { label: "Publicada", variant: "blue" },
  };
  const s = map[status] ?? { label: status, variant: "default" };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
