"use client";

// Peças visuais da identidade do painel, usadas pela página pública
// (/d/[slug]) e pelo canvas do editor — assim o que se vê montando é o que
// vai ao ar.

import { useEffect } from "react";
import type { CSSProperties } from "react";
import { googleFontsHref, type CardStyle, type DashboardBrand, type HeaderPattern } from "@/lib/dashboard/brand";

/** Carrega (uma vez) as fontes do Google que a identidade escolheu. */
export function useBrandFonts(brand: DashboardBrand | null | undefined) {
  const href = googleFontsHref(brand);
  useEffect(() => {
    if (!href) return;
    const id = `brand-fonts-${btoa(href).slice(0, 24)}`;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }, [href]);
}

/** Classes da moldura de cada indicador conforme o estilo de cartão. */
export function cardClasses(card: CardStyle | undefined): string {
  switch (card) {
    case "elevated":   return "bg-ink-900 shadow-md hover:shadow-lg";
    case "flat":       return "bg-ink-900";
    case "outline":    return "border border-ink-600 bg-transparent";
    case "accent-top": return "border border-ink-700 border-t-[3px] border-t-brand-500 bg-ink-900 shadow-xs hover:shadow-md";
    default:           return "border border-ink-700 bg-ink-900 shadow-xs hover:shadow-md";
  }
}

export function cardRadiusStyle(brand: DashboardBrand | null | undefined): CSSProperties {
  return typeof brand?.radius === "number" ? { borderRadius: brand.radius } : { borderRadius: 12 };
}

/** Grafismo de fundo do cabeçalho (quando não há imagem de capa). */
export function HeaderPatternArt({ pattern, className }: { pattern: HeaderPattern | undefined; className?: string }) {
  const p = pattern ?? "roots";
  if (p === "none") return null;
  const cls = `absolute inset-0 h-full w-full pointer-events-none ${className ?? ""}`;
  if (p === "roots") {
    return (
      <svg className={`motif-roots ${cls}`} viewBox="0 0 1000 260" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
        <path d="M940,260 C910,190 960,150 910,90 C880,50 910,10 860,-10" />
        <path d="M940,260 C900,210 870,205 850,150 C835,115 790,110 780,60" />
        <path d="M940,260 C960,200 930,170 960,120 C980,90 960,60 985,20" />
        <path d="M850,150 C820,140 805,110 770,105" />
        <path d="M910,90 C940,75 945,50 980,45" />
        <path d="M720,260 C740,200 700,175 720,120 C735,85 710,55 730,10" />
      </svg>
    );
  }
  if (p === "contour") {
    const rings = Array.from({ length: 9 }, (_, i) => i);
    return (
      <svg className={cls} viewBox="0 0 1000 260" preserveAspectRatio="xMaxYMid slice" fill="none" stroke="currentColor" aria-hidden="true" style={{ color: "rgb(var(--color-brand-500))", opacity: 0.22 }}>
        {rings.map(i => (
          <ellipse key={i} cx="860" cy="150" rx={60 + i * 42} ry={36 + i * 26} transform={`rotate(${-12 + i * 2} 860 150)`} strokeWidth={i % 3 === 0 ? 1.4 : 0.8} />
        ))}
      </svg>
    );
  }
  if (p === "dots") {
    return (
      <div className={cls} aria-hidden="true" style={{
        backgroundImage: "radial-gradient(rgb(var(--color-brand-500) / 0.28) 1.4px, transparent 1.6px)",
        backgroundSize: "18px 18px",
        maskImage: "linear-gradient(to left, black 10%, transparent 70%)",
        WebkitMaskImage: "linear-gradient(to left, black 10%, transparent 70%)",
      }} />
    );
  }
  return (
    <div className={cls} aria-hidden="true" style={{
      backgroundImage: "linear-gradient(rgb(var(--color-ink-700)) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--color-ink-700)) 1px, transparent 1px)",
      backgroundSize: "32px 32px",
      maskImage: "linear-gradient(to left, black 0%, transparent 75%)",
      WebkitMaskImage: "linear-gradient(to left, black 0%, transparent 75%)",
      opacity: 0.7,
    }} />
  );
}
