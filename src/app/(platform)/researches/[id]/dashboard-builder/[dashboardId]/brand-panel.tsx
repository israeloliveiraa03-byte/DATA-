"use client";

// Painel "Identidade visual" do editor de painéis — tudo o que a pessoa pode
// personalizar na página publicada: estilo pronto, cores (com paleta própria),
// fontes, logo e assinatura, composição da página e estilo dos gráficos.
// As mudanças aparecem na hora no canvas e são salvas sozinhas.

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  BRAND_PRESETS, FONT_OPTIONS, contrastRatio, ensureContrast, generatePalette, hexToRgb, isHex, rgbToHex, similarPairs,
  type CardStyle, type DashboardBrand, type Density, type HeaderPattern, type HeaderStyle, type PaletteScheme, type WidgetTitleStyle,
} from "@/lib/dashboard/brand";
import { COLOR_PALETTES } from "@/lib/dashboard/types";
import { resizeImageKeepAlpha } from "@/lib/images";

type Tab = "estilos" | "cores" | "tipografia" | "marca" | "pagina" | "graficos";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "estilos",    label: "Estilos",    icon: "ti-sparkles" },
  { id: "cores",      label: "Cores",      icon: "ti-palette" },
  { id: "tipografia", label: "Fontes",     icon: "ti-typography" },
  { id: "marca",      label: "Marca",      icon: "ti-id-badge-2" },
  { id: "pagina",     label: "Página",     icon: "ti-layout" },
  { id: "graficos",   label: "Gráficos",   icon: "ti-chart-bar" },
];

const EXTRA_PALETTES: { key: string; label: string; colors: string[] }[] = [
  { key: "okabe", label: "Segura p/ daltonismo", colors: ["#0072b2", "#e69f00", "#009e73", "#cc79a7", "#56b4e9", "#d55e00", "#000000"] },
  { key: "ipe", label: "Ipê", colors: ["#7b3f8c", "#e8b923", "#c2577a", "#3e6b4f", "#f0d27a", "#4b2a5c"] },
  { key: "sertao", label: "Sertão", colors: ["#9c4a1a", "#d99a3d", "#6f6a3a", "#c76b4a", "#3f4f5a", "#e8c48a"] },
  { key: "mangue", label: "Mangue", colors: ["#1f5f5b", "#6e8b3d", "#2f8f9d", "#8a6d3b", "#9bc1bc", "#3d3b30"] },
];

// Cores dominantes de uma imagem (logo): amostra reduzida, agrupamento em
// "baldes" de cor, descarta quase-branco/quase-preto/cinza e cores repetidas.
async function extractColors(dataUrl: string, max = 6): Promise<string[]> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, size, size);
  const px = ctx.getImageData(0, 0, size, size).data;
  const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < px.length; i += 4) {
    const [r, g, b, a] = [px[i], px[i + 1], px[i + 2], px[i + 3]];
    if (a < 200) continue;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx > 240 && mn > 230) continue;   // quase branco
    if (mx < 22) continue;                // quase preto
    if (mx - mn < 18) continue;           // cinza
    const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
    const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += r; e.g += g; e.b += b;
    buckets.set(key, e);
  }
  const ranked = Array.from(buckets.values()).sort((a, b) => b.n - a.n).map(e => rgbToHex([e.r / e.n, e.g / e.n, e.b / e.n]));
  const out: string[] = [];
  for (const c of ranked) {
    if (out.length >= max) break;
    if (similarPairs([...out, c], 40).some(([, j]) => j === out.length)) continue;
    out.push(c);
  }
  return out;
}

export function BrandPanel({
  brand, onChange, onClose, theme, onTheme, paletteKey, onPaletteKey, coverUrl, onCoverPick, onCoverRemove, coverBusy, canvasColor, onCanvasColor, saving,
}: {
  brand: DashboardBrand;
  onChange: (b: DashboardBrand | null) => void;
  onClose: () => void;
  theme: string; onTheme: (t: string) => void;
  paletteKey: string; onPaletteKey: (k: string) => void;
  coverUrl: string | null; onCoverPick: () => void; onCoverRemove: () => void; coverBusy: boolean;
  canvasColor: string | undefined; onCanvasColor: (c: string | undefined) => void;
  saving: boolean;
}) {
  const [tab, setTab] = useState<Tab>("estilos");
  const set = (patch: Partial<DashboardBrand>) => onChange({ ...brand, ...patch });
  const setChart = (patch: NonNullable<DashboardBrand["chart"]>) => onChange({ ...brand, chart: { ...brand.chart, ...patch } });

  // Carrega todas as fontes da lista enquanto o painel está aberto, para a
  // amostra de cada uma aparecer na própria fonte.
  useEffect(() => {
    const id = "brand-font-catalog";
    if (document.getElementById(id)) return;
    const fams = FONT_OPTIONS.filter(f => f.google).map(f => `family=${f.google}`).join("&");
    const link = document.createElement("link");
    link.id = id; link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${fams}&display=swap`;
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <aside role="dialog" aria-label="Identidade visual do painel"
      className="absolute inset-y-0 right-0 z-40 w-full sm:w-[420px] flex flex-col bg-ink-950 border-l border-ink-700 shadow-xl animate-fade-in">
      <div className="flex items-center gap-2 px-4 h-12 border-b border-ink-700 flex-shrink-0">
        <i className="ti ti-brush text-brand-500" aria-hidden="true" />
        <p className="text-sm font-semibold text-ink-50 flex-1">Identidade visual</p>
        <span className="text-2xs text-ink-500" aria-live="polite">{saving ? "Salvando…" : "Salva automaticamente"}</span>
        <button onClick={onClose} aria-label="Fechar identidade visual" className="h-8 w-8 rounded-md flex items-center justify-center text-ink-500 hover:bg-ink-800 hover:text-ink-50">
          <i className="ti ti-x" aria-hidden="true" />
        </button>
      </div>
      <div role="tablist" aria-label="Seções da identidade" className="flex gap-0.5 px-2 pt-2 border-b border-ink-700 overflow-x-auto flex-shrink-0">
        {TABS.map(t => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={cn("flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 pb-2 pt-1 text-xs font-semibold border-b-2 -mb-px transition-colors",
              tab === t.id ? "border-brand-500 text-ink-50" : "border-transparent text-ink-500 hover:text-ink-100")}>
            <i className={cn("ti", t.icon)} aria-hidden="true" /> {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {tab === "estilos" && <PresetsTab brand={brand} onChange={onChange} />}
        {tab === "cores" && <ColorsTab brand={brand} set={set} paletteKey={paletteKey} onPaletteKey={onPaletteKey} />}
        {tab === "tipografia" && <TypeTab brand={brand} set={set} />}
        {tab === "marca" && <MarkTab brand={brand} set={set} />}
        {tab === "pagina" && (
          <PageTab brand={brand} set={set} theme={theme} onTheme={onTheme} coverUrl={coverUrl} onCoverPick={onCoverPick}
            onCoverRemove={onCoverRemove} coverBusy={coverBusy} canvasColor={canvasColor} onCanvasColor={onCanvasColor} />
        )}
        {tab === "graficos" && <ChartsTab brand={brand} setChart={setChart} />}
      </div>
    </aside>
  );
}

// ─── Peças de formulário ─────────────────────────────────────────────────────

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-gold mb-1.5">{title}</p>
      {hint && <p className="text-xs text-ink-500 mb-2 leading-relaxed">{hint}</p>}
      {children}
    </section>
  );
}

function Choice<T extends string>({ value, options, onChange, cols = 2 }: { value: T; options: { v: T; label: string; icon?: string; hint?: string }[]; onChange: (v: T) => void; cols?: number }) {
  return (
    <div className={cn("grid gap-1.5", cols === 3 ? "grid-cols-3" : cols === 4 ? "grid-cols-4" : "grid-cols-2")} role="radiogroup">
      {options.map(o => (
        <button key={o.v} type="button" role="radio" aria-checked={value === o.v} onClick={() => onChange(o.v)} title={o.hint}
          className={cn("flex flex-col items-start gap-0.5 rounded-lg border px-2.5 py-2 text-left transition-colors",
            value === o.v ? "border-brand-500 bg-brand-50" : "border-ink-700 bg-ink-900 hover:border-ink-600")}>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-50">{o.icon && <i className={cn("ti", o.icon, "text-brand-500")} aria-hidden="true" />}{o.label}</span>
          {o.hint && <span className="text-2xs text-ink-500 leading-snug">{o.hint}</span>}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex items-start justify-between gap-3 py-1.5 cursor-pointer">
      <span>
        <span className="block text-xs font-semibold text-ink-100">{label}</span>
        {hint && <span className="block text-2xs text-ink-500 leading-snug">{hint}</span>}
      </span>
      <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
        className={cn("relative mt-0.5 h-5 w-9 flex-shrink-0 rounded-full transition-colors", checked ? "bg-brand-500" : "bg-ink-600")}>
        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", checked ? "left-[18px]" : "left-0.5")} />
      </button>
    </label>
  );
}

function ColorField({ label, value, fallback, onChange, onClear, note }: { label: string; value?: string; fallback: string; onChange: (v: string) => void; onClear?: () => void; note?: React.ReactNode }) {
  const [text, setText] = useState(value ?? "");
  useEffect(() => { setText(value ?? ""); }, [value]);
  return (
    <div>
      <div className="flex items-center gap-2">
        <input type="color" aria-label={label} value={value ?? fallback} onChange={e => onChange(e.target.value)}
          className="h-9 w-11 flex-shrink-0 rounded-md border border-ink-700 bg-ink-900 p-0.5 cursor-pointer" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-ink-100">{label}</p>
          <input value={text} placeholder={fallback} aria-label={`${label} em hexadecimal`}
            onChange={e => { setText(e.target.value); if (isHex(e.target.value)) onChange(e.target.value.toLowerCase()); }}
            className="w-24 bg-transparent font-mono text-2xs text-ink-500 focus:outline-none focus:text-ink-100" />
        </div>
        {onClear && value && (
          <button onClick={onClear} className="text-2xs font-semibold text-ink-500 hover:text-ink-100">Padrão</button>
        )}
      </div>
      {note}
    </div>
  );
}

// ─── Abas ───────────────────────────────────────────────────────────────────

function PresetsTab({ brand, onChange }: { brand: DashboardBrand; onChange: (b: DashboardBrand | null) => void }) {
  function apply(preset: typeof BRAND_PRESETS[number]) {
    // Mantém o que é da instituição (logo, nome, links, textos); troca o visual.
    const keep: DashboardBrand = {
      logoUrl: brand.logoUrl, organization: brand.organization, links: brand.links,
      sourceNote: brand.sourceNote, footerNote: brand.footerNote, showFooterInfo: brand.showFooterInfo,
    };
    onChange({ ...keep, ...preset.brand, preset: preset.key });
    toast.success(`Estilo “${preset.label}” aplicado — ajuste o que quiser nas outras abas.`);
  }
  return (
    <>
      <Section title="Estilos prontos" hint="Um ponto de partida completo (cores, fontes, cabeçalho, cartões). Sua logo, nome e textos são mantidos.">
        <div className="grid grid-cols-1 gap-2">
          {BRAND_PRESETS.map(p => {
            const heading = FONT_OPTIONS.find(f => f.key === p.brand.headingFont);
            const active = brand.preset === p.key;
            return (
              <button key={p.key} onClick={() => apply(p)} aria-pressed={active}
                className={cn("flex items-stretch gap-3 rounded-xl border p-2.5 text-left transition-colors", active ? "border-brand-500 bg-brand-50" : "border-ink-700 bg-ink-900 hover:border-ink-600")}>
                <span className="w-20 flex-shrink-0 rounded-md overflow-hidden flex flex-col" style={{ background: p.brand.background ?? "#f9f5ed", border: "1px solid rgba(0,0,0,0.08)" }} aria-hidden="true">
                  <span className="h-2" style={{ background: p.brand.accent }} />
                  <span className="px-1.5 pt-1 text-[13px] leading-none font-semibold" style={{ fontFamily: heading?.stack, color: "#1d1a14" }}>Aa</span>
                  <span className="mt-auto flex h-3">
                    {(p.brand.palette ?? []).slice(0, 5).map(c => <span key={c} className="flex-1" style={{ background: c }} />)}
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-50">{p.label}{active && <i className="ti ti-check text-brand-500" aria-hidden="true" />}</span>
                  <span className="block text-2xs text-ink-500 leading-snug mt-0.5">{p.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Section>
      <button onClick={() => { onChange(null); toast.success("Visual padrão do Dataº restaurado."); }}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-coral-500">
        <i className="ti ti-restore" aria-hidden="true" /> Restaurar o visual padrão
      </button>
    </>
  );
}

function ColorsTab({ brand, set, paletteKey, onPaletteKey }: { brand: DashboardBrand; set: (p: Partial<DashboardBrand>) => void; paletteKey: string; onPaletteKey: (k: string) => void }) {
  const accent = brand.accent ?? "#3b5d42";
  const palette = useMemo(() => brand.palette ?? [], [brand.palette]);
  const pairs = useMemo(() => similarPairs(palette), [palette]);
  const adjusted = isHex(brand.accent) && contrastRatio(hexToRgb(brand.accent), [255, 255, 255]) < 4.5;
  const adjustedHex = adjusted ? rgbToHex(ensureContrast(hexToRgb(brand.accent!), [255, 255, 255], 4.5)) : null;
  const [extracting, setExtracting] = useState(false);

  function setColor(i: number, c: string) { set({ palette: palette.map((x, j) => (j === i ? c : x)) }); }
  function move(i: number, d: -1 | 1) {
    const j = i + d; if (j < 0 || j >= palette.length) return;
    const next = [...palette]; [next[i], next[j]] = [next[j], next[i]]; set({ palette: next });
  }
  async function fromLogo() {
    if (!brand.logoUrl) return;
    setExtracting(true);
    try {
      const colors = await extractColors(brand.logoUrl);
      if (colors.length === 0) { toast.error("Não encontrei cores marcantes na logo."); return; }
      set({ accent: colors[0], secondary: colors[1] ?? brand.secondary, palette: colors.length >= 2 ? colors : palette });
      toast.success(`${colors.length} cores tiradas da logo.`);
    } finally { setExtracting(false); }
  }

  return (
    <>
      <Section title="Cores da identidade">
        <div className="space-y-3">
          <ColorField label="Cor principal" value={brand.accent} fallback="#3b5d42" onChange={v => set({ accent: v })} onClear={() => set({ accent: undefined })}
            note={<p className="text-2xs text-ink-500 mt-1 leading-snug">Faixa, botões, números em destaque e mapas.{adjustedHex && <> Para texto, o Dataº usa um tom mais escuro (<span className="font-mono">{adjustedHex}</span>) e garante leitura.</>}</p>} />
          <ColorField label="Cor secundária" value={brand.secondary} fallback="#8c5c18" onChange={v => set({ secondary: v })} onClear={() => set({ secondary: undefined })}
            note={<p className="text-2xs text-ink-500 mt-1">Rótulos editoriais e detalhes.</p>} />
          <ColorField label="Fundo da página" value={brand.background} fallback="#f9f5ed" onChange={v => set({ background: v })} onClear={() => set({ background: undefined })}
            note={<p className="text-2xs text-ink-500 mt-1">Vale no tom claro; no escuro o fundo continua escuro.</p>} />
        </div>
        {brand.logoUrl && (
          <button onClick={fromLogo} disabled={extracting}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-ink-700 bg-ink-900 px-3 h-8 text-xs font-semibold text-ink-100 hover:border-ink-600 disabled:opacity-50">
            <i className={cn("ti", extracting ? "ti-loader-2 animate-spin" : "ti-color-picker")} aria-hidden="true" /> Tirar as cores da logo
          </button>
        )}
      </Section>

      <Section title="Cores dos gráficos" hint="A ordem importa: a 1ª cor vai para a 1ª opção de cada pergunta. Use as setas para reordenar.">
        {palette.length >= 2 ? (
          <div className="space-y-1.5">
            {palette.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-5 text-2xs text-ink-500 tabular text-right">{i + 1}</span>
                <input type="color" value={c} onChange={e => setColor(i, e.target.value)} aria-label={`Cor ${i + 1}`}
                  className="h-8 w-10 rounded-md border border-ink-700 bg-ink-900 p-0.5 cursor-pointer" />
                <span className="font-mono text-2xs text-ink-500 flex-1">{c}</span>
                <button onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Subir cor ${i + 1}`} className="h-7 w-7 rounded text-ink-500 hover:bg-ink-800 disabled:opacity-30"><i className="ti ti-arrow-up" aria-hidden="true" /></button>
                <button onClick={() => move(i, 1)} disabled={i === palette.length - 1} aria-label={`Descer cor ${i + 1}`} className="h-7 w-7 rounded text-ink-500 hover:bg-ink-800 disabled:opacity-30"><i className="ti ti-arrow-down" aria-hidden="true" /></button>
                <button onClick={() => set({ palette: palette.filter((_, j) => j !== i) })} disabled={palette.length <= 2} aria-label={`Remover cor ${i + 1}`}
                  className="h-7 w-7 rounded text-ink-500 hover:text-coral-500 hover:bg-coral-50 disabled:opacity-30"><i className="ti ti-x" aria-hidden="true" /></button>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              {palette.length < 10 && (
                <button onClick={() => set({ palette: [...palette, generatePalette(accent, "analogous")[palette.length % 6]] })}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-400 hover:underline"><i className="ti ti-plus" aria-hidden="true" /> Adicionar cor</button>
              )}
              <button onClick={() => set({ palette: undefined })} className="inline-flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-ink-100 ml-auto">
                Usar paleta pronta
              </button>
            </div>
            {pairs.length > 0 && (
              <p className="flex gap-1.5 rounded-md bg-amber-50 px-2 py-1.5 text-2xs text-ink-100">
                <i className="ti ti-alert-triangle text-amber-500" aria-hidden="true" />
                Cores {pairs.map(([a, b]) => `${a + 1} e ${b + 1}`).join(", ")} ficam parecidas — leitores podem confundir as séries.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-ink-300">Usando a paleta pronta escolhida abaixo. Crie uma paleta própria:</p>
          </div>
        )}
        <p className="text-2xs font-semibold text-ink-300 mt-3 mb-1.5">Gerar a partir da cor principal</p>
        <div className="grid grid-cols-2 gap-1.5">
          {([["analogous", "Análoga"], ["complementary", "Complementar"], ["triad", "Tríade"], ["shades", "Tons da mesma cor"]] as [PaletteScheme, string][]).map(([k, l]) => (
            <button key={k} onClick={() => set({ palette: generatePalette(accent, k) })}
              className="flex items-center gap-2 rounded-md border border-ink-700 bg-ink-900 px-2 py-1.5 text-left hover:border-ink-600">
              <span className="flex h-4 w-12 overflow-hidden rounded-sm flex-shrink-0">{generatePalette(accent, k).slice(0, 4).map(c => <span key={c} className="flex-1" style={{ background: c }} />)}</span>
              <span className="text-2xs font-semibold text-ink-100">{l}</span>
            </button>
          ))}
        </div>
        <p className="text-2xs font-semibold text-ink-300 mt-3 mb-1.5">Paletas prontas</p>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(COLOR_PALETTES).map(([key, p]) => (
            <button key={key} onClick={() => { onPaletteKey(key); set({ palette: undefined }); }}
              aria-pressed={palette.length < 2 && paletteKey === key}
              className={cn("flex items-center gap-2 rounded-md border px-2 py-1.5 text-left", palette.length < 2 && paletteKey === key ? "border-brand-500 bg-brand-50" : "border-ink-700 bg-ink-900 hover:border-ink-600")}>
              <span className="flex h-4 w-12 overflow-hidden rounded-sm flex-shrink-0">{p.chartColors.slice(0, 4).map(c => <span key={c} className="flex-1" style={{ background: c }} />)}</span>
              <span className="text-2xs font-semibold text-ink-100 truncate">{p.label}</span>
            </button>
          ))}
          {EXTRA_PALETTES.map(p => (
            <button key={p.key} onClick={() => set({ palette: p.colors })}
              className="flex items-center gap-2 rounded-md border border-ink-700 bg-ink-900 px-2 py-1.5 text-left hover:border-ink-600">
              <span className="flex h-4 w-12 overflow-hidden rounded-sm flex-shrink-0">{p.colors.slice(0, 4).map(c => <span key={c} className="flex-1" style={{ background: c }} />)}</span>
              <span className="text-2xs font-semibold text-ink-100 truncate">{p.label}</span>
            </button>
          ))}
        </div>
      </Section>
    </>
  );
}

function FontSelect({ label, value, onChange, kinds }: { label: string; value?: string; onChange: (v: string | undefined) => void; kinds: string[] }) {
  return (
    <div>
      <p className="text-xs font-semibold text-ink-100 mb-1.5">{label}</p>
      <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1">
        {FONT_OPTIONS.filter(f => kinds.includes(f.kind)).map(f => (
          <button key={f.key} onClick={() => onChange(f.key)} aria-pressed={value === f.key}
            className={cn("rounded-md border px-2 py-1.5 text-left", value === f.key ? "border-brand-500 bg-brand-50" : "border-ink-700 bg-ink-900 hover:border-ink-600")}>
            <span className="block text-base leading-tight text-ink-50 truncate" style={{ fontFamily: f.stack }}>{f.label}</span>
            {f.note && <span className="block text-[10px] text-ink-500">{f.note}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function TypeTab({ brand, set }: { brand: DashboardBrand; set: (p: Partial<DashboardBrand>) => void }) {
  const heading = FONT_OPTIONS.find(f => f.key === brand.headingFont);
  const body = FONT_OPTIONS.find(f => f.key === brand.bodyFont);
  return (
    <>
      <div className="rounded-xl border border-ink-700 bg-ink-900 p-4">
        <p className="text-2xl font-semibold leading-tight text-ink-50" style={{ fontFamily: heading?.stack ?? "var(--font-app-serif)" }}>Escolas quilombolas em dados</p>
        <p className="mt-1.5 text-sm text-ink-300 leading-relaxed" style={{ fontFamily: body?.stack ?? "var(--font-app-sans)" }}>Indicadores produzidos com as comunidades, atualizados a cada nova resposta — 1.284 registros.</p>
      </div>
      <Section title="Títulos e números"><FontSelect label="" value={brand.headingFont} onChange={v => set({ headingFont: v })} kinds={["serif", "display", "sans"]} /></Section>
      <Section title="Texto"><FontSelect label="" value={brand.bodyFont} onChange={v => set({ bodyFont: v })} kinds={["sans", "serif"]} /></Section>
      <Section title="Título de cada indicador">
        <Choice<WidgetTitleStyle> value={brand.widgetTitle ?? "default"} onChange={v => set({ widgetTitle: v })} cols={3} options={[
          { v: "default", label: "Simples", hint: "negrito, discreto" },
          { v: "kicker", label: "Rótulo", hint: "maiúsculas, cor secundária" },
          { v: "serif", label: "Editorial", hint: "na fonte dos títulos" },
        ]} />
      </Section>
    </>
  );
}

function MarkTab({ brand, set }: { brand: DashboardBrand; set: (p: Partial<DashboardBrand>) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const links = brand.links ?? [];
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    resizeImageKeepAlpha(file, 480)
      .then(url => { if (url.length > 690000) { toast.error("Logo muito pesada — use uma imagem menor."); return; } set({ logoUrl: url }); })
      .catch(() => toast.error("Não foi possível ler a imagem."))
      .finally(() => setBusy(false));
  }
  return (
    <>
      <Section title="Logo" hint="PNG com fundo transparente fica melhor. Aparece no cabeçalho e no rodapé.">
        <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={onFile} />
        <div className="flex items-center gap-3">
          <div className="h-16 w-28 flex-shrink-0 rounded-lg border border-ink-700 flex items-center justify-center overflow-hidden"
            style={{ backgroundImage: "repeating-conic-gradient(rgb(var(--color-ink-800)) 0% 25%, transparent 0% 50%)", backgroundSize: "12px 12px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- prévia da logo (data URL) */}
            {brand.logoUrl ? <img src={brand.logoUrl} alt="Logo atual" className="max-h-14 max-w-[6.5rem] object-contain" /> : <i className="ti ti-photo text-xl text-ink-600" aria-hidden="true" />}
          </div>
          <div className="flex flex-col gap-1.5">
            <button onClick={() => ref.current?.click()} disabled={busy} className="inline-flex items-center gap-1.5 rounded-md border border-ink-700 bg-ink-900 px-3 h-8 text-xs font-semibold text-ink-100 hover:border-ink-600 disabled:opacity-50">
              <i className={cn("ti", busy ? "ti-loader-2 animate-spin" : "ti-upload")} aria-hidden="true" /> {brand.logoUrl ? "Trocar logo" : "Enviar logo"}
            </button>
            {brand.logoUrl && <button onClick={() => set({ logoUrl: undefined })} className="text-2xs font-semibold text-ink-500 hover:text-coral-500 text-left">Remover</button>}
          </div>
        </div>
      </Section>
      <Section title="Assinatura">
        <label className="block">
          <span className="block text-xs font-semibold text-ink-100 mb-1">Instituição, coletivo ou rede</span>
          <input value={brand.organization ?? ""} maxLength={120} onChange={e => set({ organization: e.target.value || undefined })} placeholder="Ex.: Coletivo de Educação da CONAQ"
            className="w-full h-9 rounded-md border border-ink-700 bg-ink-900 px-2.5 text-sm text-ink-50 focus:outline-none focus:border-brand-500" />
        </label>
        <label className="block mt-2.5">
          <span className="block text-xs font-semibold text-ink-100 mb-1">Fonte dos dados</span>
          <input value={brand.sourceNote ?? ""} maxLength={200} onChange={e => set({ sourceNote: e.target.value || undefined })} placeholder="dados primários da pesquisa"
            className="w-full h-9 rounded-md border border-ink-700 bg-ink-900 px-2.5 text-sm text-ink-50 focus:outline-none focus:border-brand-500" />
        </label>
        <label className="block mt-2.5">
          <span className="block text-xs font-semibold text-ink-100 mb-1">Linha do rodapé</span>
          <textarea value={brand.footerNote ?? ""} maxLength={300} rows={2} onChange={e => set({ footerNote: e.target.value || undefined })} placeholder="Painel publicado pela equipe da pesquisa."
            className="w-full rounded-md border border-ink-700 bg-ink-900 px-2.5 py-1.5 text-sm text-ink-50 focus:outline-none focus:border-brand-500 resize-none" />
        </label>
      </Section>
      <Section title="Links no rodapé" hint="Site da organização, relatório completo, redes — até 4.">
        <div className="space-y-2">
          {links.map((l, i) => (
            <div key={i} className="flex gap-1.5">
              <input value={l.label} placeholder="Nome" aria-label={`Nome do link ${i + 1}`} onChange={e => set({ links: links.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })}
                className="w-28 h-8 rounded-md border border-ink-700 bg-ink-900 px-2 text-xs text-ink-50 focus:outline-none focus:border-brand-500" />
              <input value={l.url} placeholder="https://" aria-label={`Endereço do link ${i + 1}`} onChange={e => set({ links: links.map((x, j) => j === i ? { ...x, url: e.target.value } : x) })}
                className="flex-1 min-w-0 h-8 rounded-md border border-ink-700 bg-ink-900 px-2 text-xs text-ink-50 focus:outline-none focus:border-brand-500" />
              <button onClick={() => set({ links: links.filter((_, j) => j !== i) })} aria-label={`Remover link ${i + 1}`} className="h-8 w-8 rounded-md text-ink-500 hover:text-coral-500 hover:bg-coral-50"><i className="ti ti-x" aria-hidden="true" /></button>
            </div>
          ))}
          {links.length < 4 && (
            <button onClick={() => set({ links: [...links, { label: "", url: "https://" }] })} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-400 hover:underline">
              <i className="ti ti-plus" aria-hidden="true" /> Adicionar link
            </button>
          )}
          {links.some(l => !l.label.trim() || !/^https?:\/\/.+\..+/.test(l.url)) && (
            <p className="text-2xs text-amber-600">Links sem nome ou com endereço incompleto não são salvos.</p>
          )}
        </div>
      </Section>
    </>
  );
}

function HeaderThumb({ kind }: { kind: HeaderStyle }) {
  return (
    <span className="block h-10 w-full rounded border border-ink-700 bg-ink-950 overflow-hidden relative" aria-hidden="true">
      {kind === "banner" && <span className="absolute inset-0 bg-brand-500" />}
      <span className={cn("absolute top-2 h-1.5 rounded", kind === "banner" ? "bg-white/90" : "bg-ink-300",
        kind === "centered" ? "left-1/2 -translate-x-1/2 w-12" : "left-2 w-14", kind === "minimal" && "left-6 w-12")} />
      {kind === "minimal" && <span className="absolute left-2 top-1.5 h-3 w-3 rounded-sm bg-brand-500" />}
      {kind === "editorial" && <span className="absolute left-1 top-1.5 bottom-3 w-0.5 bg-gold" />}
      <span className={cn("absolute top-5 h-1 rounded", kind === "banner" ? "bg-white/60" : "bg-ink-600",
        kind === "centered" ? "left-1/2 -translate-x-1/2 w-16" : "left-2 w-20", kind === "minimal" && "left-6 w-10")} />
    </span>
  );
}

function PageTab({ brand, set, theme, onTheme, coverUrl, onCoverPick, onCoverRemove, coverBusy, canvasColor, onCanvasColor }: {
  brand: DashboardBrand; set: (p: Partial<DashboardBrand>) => void;
  theme: string; onTheme: (t: string) => void;
  coverUrl: string | null; onCoverPick: () => void; onCoverRemove: () => void; coverBusy: boolean;
  canvasColor: string | undefined; onCanvasColor: (c: string | undefined) => void;
}) {
  const header = brand.header ?? "editorial";
  return (
    <>
      <Section title="Tom da página">
        <Choice value={theme === "dark" ? "dark" : "light"} onChange={onTheme} options={[
          { v: "light", label: "Claro", icon: "ti-sun" }, { v: "dark", label: "Escuro", icon: "ti-moon" },
        ]} />
      </Section>
      <Section title="Cabeçalho">
        <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Composição do cabeçalho">
          {([["editorial", "Editorial", "barra lateral dourada"], ["banner", "Faixa cheia", "fundo na cor principal"], ["centered", "Centralizado", "título grande ao centro"], ["minimal", "Compacto", "logo ao lado do título"]] as [HeaderStyle, string, string][]).map(([v, l, h]) => (
            <button key={v} role="radio" aria-checked={header === v} onClick={() => set({ header: v })}
              className={cn("rounded-lg border p-2 text-left", header === v ? "border-brand-500 bg-brand-50" : "border-ink-700 bg-ink-900 hover:border-ink-600")}>
              <HeaderThumb kind={v} />
              <span className="block mt-1.5 text-xs font-semibold text-ink-50">{l}</span>
              <span className="block text-2xs text-ink-500">{h}</span>
            </button>
          ))}
        </div>
        <p className="text-2xs font-semibold text-ink-300 mt-3 mb-1.5">Grafismo (quando não há imagem de capa)</p>
        <Choice<HeaderPattern> value={brand.pattern ?? "roots"} onChange={v => set({ pattern: v })} cols={3} options={[
          { v: "roots", label: "Raízes" }, { v: "contour", label: "Curvas de nível" }, { v: "dots", label: "Pontos" }, { v: "grid", label: "Malha" }, { v: "none", label: "Nenhum" },
        ]} />
        <div className="mt-3 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- capa enviada (data URL) */}
          {coverUrl && <img src={coverUrl} alt="Capa atual" className="h-10 w-16 rounded object-cover border border-ink-700" />}
          <button onClick={onCoverPick} disabled={coverBusy} className="inline-flex items-center gap-1.5 rounded-md border border-ink-700 bg-ink-900 px-3 h-8 text-xs font-semibold text-ink-100 hover:border-ink-600 disabled:opacity-50">
            <i className={cn("ti", coverBusy ? "ti-loader-2 animate-spin" : "ti-photo")} aria-hidden="true" /> {coverUrl ? "Trocar capa" : "Imagem de capa"}
          </button>
          {coverUrl && <button onClick={onCoverRemove} className="text-2xs font-semibold text-ink-500 hover:text-coral-500">Remover</button>}
        </div>
        <Toggle checked={brand.showBand !== false} onChange={v => set({ showBand: v ? undefined : false })} label="Faixa institucional no topo" hint="Nome da instituição e aviso de atualização contínua." />
      </Section>
      <Section title="Cartões dos indicadores">
        <Choice<CardStyle> value={brand.card ?? "bordered"} onChange={v => set({ card: v })} cols={3} options={[
          { v: "bordered", label: "Borda" }, { v: "elevated", label: "Sombra" }, { v: "flat", label: "Plano" }, { v: "outline", label: "Contorno" }, { v: "accent-top", label: "Faixa no topo" },
        ]} />
        <label className="block mt-3">
          <span className="flex justify-between text-xs font-semibold text-ink-100 mb-1">Cantos <span className="font-normal text-ink-500 tabular">{brand.radius ?? 12}px</span></span>
          <input type="range" min={0} max={28} value={brand.radius ?? 12} onChange={e => set({ radius: Number(e.target.value) })} className="w-full" aria-label="Arredondamento dos cantos" />
        </label>
        <p className="text-2xs font-semibold text-ink-300 mt-2 mb-1.5">Espaço entre indicadores</p>
        <Choice<Density> value={brand.density ?? "normal"} onChange={v => set({ density: v })} cols={3} options={[
          { v: "compact", label: "Compacto" }, { v: "normal", label: "Padrão" }, { v: "airy", label: "Arejado" },
        ]} />
      </Section>
      <Section title="Área dos indicadores">
        <div className="flex items-center gap-2">
          <input type="color" aria-label="Cor de fundo da área dos indicadores" value={canvasColor ?? "#ffffff"} onChange={e => onCanvasColor(e.target.value)}
            className="h-8 w-11 rounded-md border border-ink-700 bg-ink-900 p-0.5" />
          <span className="text-xs text-ink-300 flex-1">Cor atrás dos cartões</span>
          {canvasColor && <button onClick={() => onCanvasColor(undefined)} className="text-2xs font-semibold text-ink-500 hover:text-ink-100">Sem cor</button>}
        </div>
      </Section>
      <Section title="Rodapé">
        <Toggle checked={brand.showFooterInfo !== false} onChange={v => set({ showFooterInfo: v ? undefined : false })} label="Blocos “Sobre / Como ler / Proteção de dados”" />
      </Section>
    </>
  );
}

function ChartsTab({ brand, setChart }: { brand: DashboardBrand; setChart: (p: NonNullable<DashboardBrand["chart"]>) => void }) {
  const c = brand.chart ?? {};
  return (
    <>
      <Section title="Estilo dos gráficos" hint="Vale para todo o painel. Cada gráfico ainda pode mostrar ou esconder valores nas próprias propriedades.">
        <Toggle checked={c.dataLabels ?? false} onChange={v => setChart({ dataLabels: v })} label="Escrever os valores nos gráficos" hint="Ajuda na leitura e em impressão; em gráficos cheios, pode poluir." />
        <Toggle checked={c.gridlines ?? true} onChange={v => setChart({ gridlines: v })} label="Linhas de grade" />
        <label className="block mt-2">
          <span className="flex justify-between text-xs font-semibold text-ink-100 mb-1">Cantos das barras <span className="font-normal text-ink-500 tabular">{c.barRadius ?? 4}px</span></span>
          <input type="range" min={0} max={16} value={c.barRadius ?? 4} onChange={e => setChart({ barRadius: Number(e.target.value) })} className="w-full" aria-label="Arredondamento das barras" />
        </label>
      </Section>
      <p className="rounded-lg border border-ink-700 bg-ink-900 p-3 text-2xs text-ink-500 leading-relaxed">
        <i className="ti ti-bulb text-gold mr-1" aria-hidden="true" />
        Imagem de fundo (PNG com transparência), mapa sem mapa-base e o globo 3D se ajustam em cada widget, na seção Aparência das propriedades.
      </p>
    </>
  );
}
