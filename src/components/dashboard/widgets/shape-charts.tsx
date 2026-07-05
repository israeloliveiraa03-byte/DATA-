"use client";

// Gráficos que o recharts não cobre bem — desenhados com SVG/HTML próprios.
// Regra de arquitetura: cálculo (escala, quartil, densidade) é feito em
// números puros (o quartil/desvio vem de d3-array lá no motor de agregação);
// o DOM inteiro é do React via JSX normal. NUNCA usar d3.select().append()
// dentro de componente React — briga com o reconciliation e quebra de forma
// imprevisível.

import type { ChoiceAggResult, DisplayMode, DistributionResult, DivergingResult, DumbbellResult, RangeBarResult } from "@/lib/dashboard/types";
import { DIVERGING_COLORS } from "@/lib/dashboard/types";
import { ChartLegend, formatNumber, mixHex, toPercent, useContainerSize } from "./chart-common";

const TEXT_DARK  = "#5c3f13";
const TEXT_MUTED = "#a06d28";
const GRID_LINE  = "#f3e4cb";

// ─── Barra divergente (Likert em torno do neutro) ──────────────────────────
// Uma barra horizontal única centrada no ponto neutro: opções abaixo do
// neutro crescem pra esquerda, acima pra direita, o bucket neutro fica
// cinza montado sobre o centro (metade pra cada lado). Cores: par
// divergente único do produto (vermelho ↔ azul, seguro pra daltonismo),
// com passos mais claros perto do centro — nunca uma matiz no ponto médio.
export function DivergingBarView({ data }: { data: DivergingResult }) {
  const total = data.totalResponses;
  if (total === 0 || data.buckets.length === 0) return null;

  const negs = data.buckets.filter(b => b.side === "neg");
  const neu  = data.buckets.find(b => b.side === "neu");
  const poss = data.buckets.filter(b => b.side === "pos");

  const pct = (c: number) => toPercent(c, total);
  const negTotal = negs.reduce((a, b) => a + pct(b.count), 0);
  const posTotal = poss.reduce((a, b) => a + pct(b.count), 0);
  const neuP = neu ? pct(neu.count) : 0;

  // Escala: o lado mais “cheio” (incluindo meia fatia do neutro) encosta na
  // borda com 6% de folga; o centro do widget é sempre o ponto neutro.
  const extent = Math.max(negTotal + neuP / 2, posTotal + neuP / 2, 1);
  const k = 44 / extent; // 44% de meia-largura útil (50 − folga)

  // Cor por distância do neutro: mais longe = mais escuro (uma matiz por lado).
  const negColor = (j: number) => mixHex(DIVERGING_COLORS.negative, "#ffffff", negs.length <= 1 ? 0 : (j / (negs.length - 1)) * 0.5);
  const posColor = (j: number) => mixHex(DIVERGING_COLORS.positive, "#ffffff", poss.length <= 1 ? 0 : (1 - j / (poss.length - 1)) * 0.5);

  // Segmentos em ordem visual (esquerda → direita), com a % de largura de cada um.
  const segments: { label: string; count: number; color: string; widthPct: number }[] = [
    ...negs.map((b, j) => ({ label: b.label, count: b.count, color: negColor(j), widthPct: pct(b.count) * k })),
    ...(neu ? [{ label: neu.label, count: neu.count, color: DIVERGING_COLORS.neutral, widthPct: neuP * k }] : []),
    ...poss.map((b, j) => ({ label: b.label, count: b.count, color: posColor(j), widthPct: pct(b.count) * k })),
  ];
  const startPct = 50 - (negTotal + neuP / 2) * k;
  const totalWidthPct = segments.reduce((a, s) => a + s.widthPct, 0);

  const legendColors = segments.map(s => s.color);

  return (
    <div className="w-full h-full flex flex-col justify-center gap-1.5">
      <div className="flex items-baseline justify-between px-1">
        <span className="text-xs font-bold" style={{ color: DIVERGING_COLORS.negative }}>{formatNumber(negTotal, 0)}%</span>
        {neu && <span className="text-2xs" style={{ color: TEXT_MUTED }}>neutro {formatNumber(neuP, 0)}%</span>}
        <span className="text-xs font-bold" style={{ color: DIVERGING_COLORS.positive }}>{formatNumber(posTotal, 0)}%</span>
      </div>
      <div className="relative" style={{ height: 30 }}>
        {/* trilho de fundo */}
        <div className="absolute inset-x-0 rounded-md" style={{ top: 4, bottom: 4, background: "#faf5ea" }} />
        {/* segmentos */}
        <div className="absolute flex" style={{ left: `${startPct}%`, width: `${totalWidthPct}%`, top: 0, bottom: 0, gap: 2 }}>
          {segments.map((s, i) => (
            <div key={i} className="h-full rounded-[3px]" title={`${s.label}: ${formatNumber(s.count)} (${formatNumber(pct(s.count), 1)}%)`}
              style={{ width: `${totalWidthPct > 0 ? (s.widthPct / totalWidthPct) * 100 : 0}%`, background: s.color }} />
          ))}
        </div>
        {/* linha do ponto neutro */}
        <div className="absolute" style={{ left: "calc(50% - 1px)", top: -3, bottom: -3, width: 2, background: TEXT_DARK, opacity: 0.4 }} />
      </div>
      <ChartLegend data={segments} colors={legendColors} values={segments.map(s => `${formatNumber(pct(s.count), 0)}%`)} />
    </div>
  );
}

// ─── Boxplot / Violino ─────────────────────────────────────────────────────

function niceTicks(lo: number, hi: number, count = 4): number[] {
  if (hi <= lo) return [lo];
  const step = (hi - lo) / (count - 1);
  return Array.from({ length: count }, (_, i) => lo + step * i);
}

function fmtShort(n: number): string {
  return Number.isInteger(n) ? formatNumber(n) : formatNumber(n, 1);
}

export function DistributionView({ data, colors, variant }: { data: DistributionResult; colors: string[]; variant: "boxplot" | "violin" }) {
  const [ref, size] = useContainerSize<HTMLDivElement>();
  const groups = data.groups;
  if (groups.length === 0) return null;

  const lo0 = Math.min(...groups.map(g => g.min));
  const hi0 = Math.max(...groups.map(g => g.max));
  const pad = (hi0 - lo0 || 1) * 0.06;
  const lo = lo0 - pad;
  const hi = hi0 + pad;

  const padLeft = 38, padRight = 6, padTop = 6, padBottom = 18;
  const W = Math.max(size.width, 80);
  const H = Math.max(size.height - (groups.length >= 2 ? 26 : 0), 60);
  const innerW = W - padLeft - padRight;
  const innerH = H - padTop - padBottom;
  const y = (v: number) => padTop + (1 - (v - lo) / (hi - lo)) * innerH;
  const band = innerW / groups.length;
  const cx = (i: number) => padLeft + band * i + band / 2;
  const halfW = Math.min(28, band * 0.36);
  const ticks = niceTicks(lo0, hi0);

  return (
    <div className="w-full h-full flex flex-col">
      <div ref={ref} className="flex-1 min-h-0">
        {size.width > 0 && (
          <svg width={W} height={H} role="img" aria-label={`${variant === "violin" ? "Violino" : "Boxplot"} de ${data.fieldLabel}`}>
            {/* grade + eixo Y */}
            {ticks.map((t, i) => (
              <g key={i}>
                <line x1={padLeft} x2={W - padRight} y1={y(t)} y2={y(t)} stroke={GRID_LINE} strokeWidth={1} />
                <text x={padLeft - 4} y={y(t) + 3} textAnchor="end" fontSize={9} fill={TEXT_DARK}>{fmtShort(t)}</text>
              </g>
            ))}
            {groups.map((g, i) => {
              const color = colors[i % colors.length];
              const center = cx(i);
              const label = g.label.length > Math.floor(band / 6) ? `${g.label.slice(0, Math.max(2, Math.floor(band / 6) - 1))}…` : g.label;
              const statsTitle = `${g.label} — n=${g.count} · mín ${fmtShort(g.min)} · Q1 ${fmtShort(g.q1)} · mediana ${fmtShort(g.median)} · Q3 ${fmtShort(g.q3)} · máx ${fmtShort(g.max)}`;
              return (
                <g key={g.key}>
                  <title>{statsTitle}</title>
                  {variant === "boxplot" ? (
                    <>
                      {/* bigodes (1,5×IQR) */}
                      <line x1={center} x2={center} y1={y(g.upperWhisker)} y2={y(g.q3)} stroke={color} strokeWidth={1.5} />
                      <line x1={center} x2={center} y1={y(g.q1)} y2={y(g.lowerWhisker)} stroke={color} strokeWidth={1.5} />
                      <line x1={center - halfW * 0.5} x2={center + halfW * 0.5} y1={y(g.upperWhisker)} y2={y(g.upperWhisker)} stroke={color} strokeWidth={1.5} />
                      <line x1={center - halfW * 0.5} x2={center + halfW * 0.5} y1={y(g.lowerWhisker)} y2={y(g.lowerWhisker)} stroke={color} strokeWidth={1.5} />
                      {/* caixa Q1–Q3 */}
                      <rect x={center - halfW} y={y(g.q3)} width={halfW * 2} height={Math.max(1, y(g.q1) - y(g.q3))}
                        rx={3} fill={color} fillOpacity={0.18} stroke={color} strokeWidth={1.5} />
                      {/* mediana */}
                      <line x1={center - halfW} x2={center + halfW} y1={y(g.median)} y2={y(g.median)} stroke={color} strokeWidth={2.5} />
                      {/* outliers */}
                      {g.outliers.map((o, oi) => (
                        <circle key={oi} cx={center} cy={y(o)} r={2.5} fill={color} stroke="#fff" strokeWidth={1} />
                      ))}
                    </>
                  ) : g.density.length > 0 ? (
                    <>
                      <path
                        d={[
                          ...g.density.map((p, pi) => `${pi === 0 ? "M" : "L"} ${(center + p.w * halfW).toFixed(1)} ${y(p.x).toFixed(1)}`),
                          ...[...g.density].reverse().map(p => `L ${(center - p.w * halfW).toFixed(1)} ${y(p.x).toFixed(1)}`),
                          "Z",
                        ].join(" ")}
                        fill={color} fillOpacity={0.25} stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
                      <line x1={center - halfW * 0.6} x2={center + halfW * 0.6} y1={y(g.median)} y2={y(g.median)} stroke={color} strokeWidth={2.5} />
                    </>
                  ) : (
                    // grupo com menos de 3 valores: sem densidade — marca mín–máx + mediana
                    <>
                      <line x1={center} x2={center} y1={y(g.max)} y2={y(g.min)} stroke={color} strokeWidth={1.5} />
                      <circle cx={center} cy={y(g.median)} r={4} fill={color} stroke="#fff" strokeWidth={1.5} />
                    </>
                  )}
                  <text x={center} y={H - 5} textAnchor="middle" fontSize={9} fill={TEXT_DARK}>{label}</text>
                </g>
              );
            })}
          </svg>
        )}
      </div>
      {groups.length >= 2 && <ChartLegend data={groups} colors={colors} values={groups.map(g => `n=${formatNumber(g.count)}`)} />}
    </div>
  );
}

// ─── Pontos / pirulito ─────────────────────────────────────────────────────
// Linhas HTML: rótulo à esquerda, trilho com o ponto (e a haste, no
// pirulito) à direita — valor com rótulo direto ao lado do ponto.
export function DotPlotView({ data, colors, displayMode, lollipop }: { data: ChoiceAggResult; colors: string[]; displayMode: DisplayMode; lollipop: boolean }) {
  const percent = displayMode === "percent";
  const values = data.buckets.map(b => percent ? toPercent(b.count, data.totalResponses) : b.count);
  const max = Math.max(...values, 1);
  const fmt = (v: number) => percent ? `${formatNumber(v, 0)}%` : formatNumber(v);

  return (
    <div className="w-full h-full overflow-y-auto flex flex-col justify-center py-1">
      {data.buckets.map((b, i) => {
        const v = values[i];
        const posPct = (v / max) * 100;
        const color = colors[i % colors.length];
        return (
          <div key={b.optionId} className="flex items-center gap-2 min-h-6" title={`${b.label}: ${formatNumber(b.count)} (${formatNumber(toPercent(b.count, data.totalResponses), 1)}%)`}>
            <span className="w-24 flex-shrink-0 text-2xs truncate text-right" style={{ color: TEXT_DARK }}>{b.label}</span>
            <div className="flex-1 relative h-6" style={{ borderLeft: `1px solid ${GRID_LINE}`, marginRight: 38 }}>
              {lollipop && (
                <div className="absolute rounded-full" style={{ left: 0, width: `${posPct}%`, top: "calc(50% - 1px)", height: 2, background: color, opacity: 0.55 }} />
              )}
              <div className="absolute rounded-full" style={{
                left: `${posPct}%`, top: "50%", transform: "translate(-50%, -50%)",
                width: 10, height: 10, background: color, border: "1.5px solid #fff", boxShadow: "0 0 0 1px rgba(0,0,0,0.06)",
              }} />
              <span className="absolute text-2xs font-semibold whitespace-nowrap" style={{
                left: `calc(${posPct}% + 8px)`, top: "50%", transform: "translateY(-50%)", color: TEXT_DARK,
              }}>{fmt(v)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Waffle ────────────────────────────────────────────────────────────────
// Grid 10×10 = 100 quadrados; cada quadrado é 1% das respostas do campo.
// Preenche de baixo pra cima. Uma proporção só — a alternativa honesta à
// pizza quando o que importa é UM número.
export function WaffleView({ data, colors, optionId }: { data: ChoiceAggResult; colors: string[]; optionId?: string }) {
  const index = optionId ? data.buckets.findIndex(b => b.optionId === optionId) : -1;
  const bucket = index >= 0 ? data.buckets[index]
    : data.buckets.reduce((best, b) => (b.count > best.count ? b : best), data.buckets[0]);
  const bucketIndex = index >= 0 ? index : data.buckets.indexOf(bucket);
  if (!bucket) return null;
  const pctValue = toPercent(bucket.count, data.totalResponses);
  const filled = Math.round(pctValue);
  const color = colors[bucketIndex % colors.length];

  return (
    <div className="w-full h-full flex items-center justify-center gap-4 flex-wrap overflow-hidden">
      <div className="grid flex-shrink-0" style={{
        gridTemplateColumns: "repeat(10, 1fr)", gap: 2,
        width: "min(58%, 160px)", aspectRatio: "1 / 1",
      }}
        role="img" aria-label={`${formatNumber(pctValue, 0)}% — ${bucket.label}`}>
        {Array.from({ length: 100 }, (_, i) => {
          const row = Math.floor(i / 10); // 0 = topo
          const col = i % 10;
          const rank = (9 - row) * 10 + col; // preenchimento de baixo pra cima
          return <div key={i} className="rounded-[2px]" style={{ background: rank < filled ? color : "#efe6d2", aspectRatio: "1 / 1" }} />;
        })}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-3xl font-bold leading-none" style={{ color: TEXT_DARK, fontFamily: "var(--font-serif), Georgia, serif" }}>
          {formatNumber(pctValue, 0)}%
        </span>
        <span className="text-xs mt-1 truncate" style={{ color: TEXT_DARK }}>{bucket.label}</span>
        <span className="text-2xs" style={{ color: TEXT_MUTED }}>{formatNumber(bucket.count)} de {formatNumber(data.totalResponses)} respostas</span>
      </div>
    </div>
  );
}

// ─── Dumbbell (antes/depois) ───────────────────────────────────────────────
// Período A = tom claro da mesma matiz, período B = tom cheio (dois estados
// da MESMA entidade → claro→escuro de uma matiz, não duas matizes).
export function DumbbellView({ data, colors, displayMode }: { data: DumbbellResult; colors: string[]; displayMode: DisplayMode }) {
  const percent = displayMode === "percent";
  const colorB = colors[0];
  const colorA = mixHex(colorB, "#ffffff", 0.55);

  const val = (count: number, total: number) => percent ? toPercent(count, total) : count;
  const rows = data.categories.map(c => ({ label: c.label, a: val(c.a, data.totalA), b: val(c.b, data.totalB), rawA: c.a, rawB: c.b }));
  const max = Math.max(...rows.flatMap(r => [r.a, r.b]), 1);
  const fmt = (v: number) => percent ? `${formatNumber(v, 0)}%` : formatNumber(v);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col justify-center py-1">
        {rows.map((r, i) => {
          const aPct = (r.a / max) * 100;
          const bPct = (r.b / max) * 100;
          const left = Math.min(aPct, bPct);
          const width = Math.abs(bPct - aPct);
          return (
            <div key={i} className="flex items-center gap-2 min-h-7"
              title={`${r.label} — ${data.periodALabel}: ${formatNumber(r.rawA)} · ${data.periodBLabel}: ${formatNumber(r.rawB)}`}>
              <span className="w-24 flex-shrink-0 text-2xs truncate text-right" style={{ color: TEXT_DARK }}>{r.label}</span>
              <div className="flex-1 relative h-7" style={{ borderLeft: `1px solid ${GRID_LINE}`, marginRight: 38 }}>
                <div className="absolute rounded-full" style={{ left: `${left}%`, width: `${width}%`, top: "calc(50% - 1px)", height: 2, background: "#d9c9a8" }} />
                <div className="absolute rounded-full" style={{ left: `${aPct}%`, top: "50%", transform: "translate(-50%, -50%)", width: 10, height: 10, background: colorA, border: "1.5px solid #fff", boxShadow: "0 0 0 1px rgba(0,0,0,0.06)" }} />
                <div className="absolute rounded-full" style={{ left: `${bPct}%`, top: "50%", transform: "translate(-50%, -50%)", width: 10, height: 10, background: colorB, border: "1.5px solid #fff", boxShadow: "0 0 0 1px rgba(0,0,0,0.06)" }} />
                <span className="absolute text-2xs font-semibold whitespace-nowrap" style={{ left: `calc(${Math.max(aPct, bPct)}% + 8px)`, top: "50%", transform: "translateY(-50%)", color: TEXT_DARK }}>
                  {fmt(r.b)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <ChartLegend
        data={[{ label: data.periodALabel }, { label: data.periodBLabel }]}
        colors={[colorA, colorB]}
        values={[`${formatNumber(data.totalA)} resp.`, `${formatNumber(data.totalB)} resp.`]}
      />
    </div>
  );
}

// ─── Barra de intervalo (date_range) ───────────────────────────────────────
export function RangeBarView({ data, colors }: { data: RangeBarResult; colors: string[] }) {
  if (data.rows.length === 0) return null;
  const min = Math.min(...data.rows.map(r => r.start));
  const max = Math.max(...data.rows.map(r => r.end));
  const span = max - min || 1;
  const DAY = 86400000;

  const fmtDate = (t: number) => new Date(t).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  const ticks = [min, min + span / 2, max];

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col justify-center py-1">
        {data.rows.map((r, i) => {
          const left = ((r.start - min) / span) * 100;
          const width = Math.max(((r.end - r.start) / span) * 100, 1);
          const days = Math.round((r.end - r.start) / DAY) + 1;
          return (
            <div key={i} className="flex items-center gap-2 min-h-5"
              title={`${fmtDate(r.start)} – ${fmtDate(r.end)} (${days} ${days === 1 ? "dia" : "dias"})`}>
              <span className="w-14 flex-shrink-0 text-2xs text-right" style={{ color: TEXT_MUTED }}>{r.label}</span>
              <div className="flex-1 relative h-5">
                <div className="absolute inset-x-0" style={{ top: "50%", height: 1, background: GRID_LINE }} />
                <div className="absolute rounded-full" style={{
                  left: `${left}%`, width: `${width}%`, top: "calc(50% - 5px)", height: 10,
                  background: colors[0], opacity: 0.9,
                }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between px-16 flex-shrink-0">
        {ticks.map((t, i) => <span key={i} className="text-2xs" style={{ color: TEXT_MUTED }}>{fmtDate(t)}</span>)}
      </div>
    </div>
  );
}
