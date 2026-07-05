"use client";

// Peças compartilhadas entre widget-renderer.tsx e os arquivos de gráfico
// (extra-charts.tsx / shape-charts.tsx) — extraídas do renderer pra evitar
// ciclo de import (o renderer importa os gráficos, nunca o contrário).

import { useEffect, useRef, useState } from "react";

export function formatNumber(n: number, decimals?: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: decimals ?? 0, maximumFractionDigits: decimals ?? 2 });
}

// "percent" = % das respostas que marcaram a opção (base: respostas que
// responderam o campo; em múltipla escolha a soma pode passar de 100% de
// propósito — cada resposta pode marcar mais de uma opção).
export function toPercent(count: number, total: number): number {
  return total > 0 ? (count / total) * 100 : 0;
}

// Mistura duas cores hex (t = 0 devolve a, t = 1 devolve b) — usada pra
// gerar os passos claro→escuro do par divergente e o tom "antes" do
// dumbbell, sem precisar de arrays de cor hardcoded por paleta.
export function mixHex(a: string, b: string, t: number): string {
  const pa = a.replace("#", "");
  const pb = b.replace("#", "");
  const ch = (i: number) => {
    const va = parseInt(pa.slice(i, i + 2), 16);
    const vb = parseInt(pb.slice(i, i + 2), 16);
    return Math.round(va + (vb - va) * t).toString(16).padStart(2, "0");
  };
  return `#${ch(0)}${ch(2)}${ch(4)}`;
}

export function EmptyState() {
  return <p className="text-xs italic" style={{ color: "#a06d28" }}>Sem dados suficientes ainda</p>;
}

// Legenda temática dos gráficos — chips arredondados com a marca de cor da
// série, mesmo estilo já usado na legenda do mapa de pontos (o texto fica
// sempre na cor de texto, nunca na cor da série — a identidade é do chip).
// Regra: legenda sempre presente pra 2+ séries/categorias; pra 1 série só,
// o título do widget já nomeia o dado — não renderiza chip nenhum.
export function ChartLegend({ data, colors, values }: { data: { label: string }[]; colors: string[]; values?: string[] }) {
  if (data.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-1 justify-center px-1 pt-1 flex-shrink-0">
      {data.map((d, i) => (
        <span key={i} className="flex items-center gap-1 text-2xs rounded-full px-2 py-0.5"
          style={{ color: "#5c3f13", border: "1px solid #e8d8be", background: "#fdfaf4" }}>
          <span className="inline-block w-2 h-2 rounded-full flex-shrink-0" style={{ background: colors[i % colors.length] }} />
          {d.label}
          {values?.[i] !== undefined && <span style={{ color: "#a06d28" }}>{values[i]}</span>}
        </span>
      ))}
    </div>
  );
}

// Tooltip padrão dos gráficos recharts — mesma moldura terracota do resto.
export const TOOLTIP_STYLE = {
  contentStyle: { border: "1px solid #e8d8be", borderRadius: 8, background: "#fff", fontSize: 11, padding: "6px 10px", boxShadow: "0 2px 6px rgba(22,23,26,0.08)" },
  labelStyle: { color: "#5c3f13", fontWeight: 600 },
  itemStyle: { color: "#111", padding: 0 },
} as const;

// Mede o contêiner dos gráficos SVG próprios (boxplot/violino/divergente) —
// eles precisam de pixels reais pra posicionar texto sem distorção (viewBox
// esticado deformaria a tipografia).
export function useContainerSize<T extends HTMLElement>(): [React.RefObject<T | null>, { width: number; height: number }] {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ width: rect.width, height: rect.height });
    });
    observer.observe(el);
    setSize({ width: el.clientWidth, height: el.clientHeight });
    return () => observer.disconnect();
  }, []);
  return [ref, size];
}
