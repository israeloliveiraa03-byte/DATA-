import { cn } from "@/lib/utils";

interface ThinkingDotsProps {
  className?: string;
  dotClassName?: string;
}

// Indicador de "processando" — 3 pontos pulsando em sequência, inspirado na
// animação do próprio Claude Code enquanto pensa. Usar em qualquer estado de
// carregamento/espera assíncrona (ver Button `loading`).
export function ThinkingDots({ className, dotClassName }: ThinkingDotsProps) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)} role="status" aria-label="Carregando">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className={cn("w-1.5 h-1.5 rounded-full bg-current animate-dot-pulse", dotClassName)}
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}
