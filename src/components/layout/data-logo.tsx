import { cn } from "@/lib/utils";

interface DataLogoProps {
  className?: string;
  markClassName?: string;
  animated?: boolean;
  /** Relevo 3D no wordmark (Fraunces + text-shadow em camadas) — usar em destaques grandes (hero, login), não no chrome pequeno (sidebar/topbar). */
  depth?: boolean;
}

// ─── Marca "Dataº" — o "º" vira um pequeno nó de rede, com conexões
// pulsando pra fora, representando dados conectados. Cores da marca são fixas
// (variáveis do tema "Confluência": dourado, verde institucional, terracota
// e rio) — o wordmark herda `currentColor` do contexto pra continuar legível
// em qualquer fundo. Ver "Identidade visual" no CLAUDE.md. ──────────────────────────────
export function DataLogo({ className, markClassName, animated = true, depth = false }: DataLogoProps) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline font-bold tracking-tight",
        depth && "font-serif font-semibold logo-depth", !depth && "font-serif font-semibold",
        className,
      )}
    >
      Data
      <svg
        viewBox="0 0 34 34"
        className={cn("inline-block w-[0.62em] h-[0.62em] -translate-y-[0.42em] ml-px", markClassName)}
        aria-hidden="true"
      >
        {/* linhas de conexão */}
        <g stroke="rgb(var(--color-gold))" strokeOpacity="0.75" strokeWidth="1.6" strokeLinecap="round">
          <line x1="17" y1="17" x2="30" y2="6"  />
          <line x1="17" y1="17" x2="31" y2="19" />
          <line x1="17" y1="17" x2="19" y2="32" />
        </g>
        {/* o "º" propriamente — um anel */}
        <circle cx="17" cy="17" r="9" fill="none" stroke="rgb(var(--color-gold))" strokeWidth="4.5" />
        {/* nós nas pontas das conexões */}
        <circle cx="30" cy="6"  r="2.6" fill="rgb(var(--color-brand-500))" className={cn(animated && "animate-pulse-soft")} style={animated ? { animationDelay: "0s" } : undefined} />
        <circle cx="31" cy="19" r="2.6" fill="rgb(var(--color-coral-500))" className={cn(animated && "animate-pulse-soft")} style={animated ? { animationDelay: "0.4s" } : undefined} />
        <circle cx="19" cy="32" r="2.6" fill="rgb(var(--color-teal-500))" className={cn(animated && "animate-pulse-soft")} style={animated ? { animationDelay: "0.8s" } : undefined} />
      </svg>
    </span>
  );
}
