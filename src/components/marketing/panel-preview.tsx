import { BRAZIL_STATES, BRAZIL_STATES_VIEWBOX } from "@/components/layout/brazil-states-paths";

// Composição ilustrativa de um painel Dataº para a página inicial: cabeçalho
// editorial, indicadores com divisória de 1px, mapa coroplético por UF (malha
// oficial do IBGE) e barras. Valores são de exemplo — sinalizado na legenda.

const SAMPLE: Record<string, number> = {
  MA: 5, BA: 5, PA: 4, MG: 4, PI: 3, PE: 3, AL: 3, SE: 2, CE: 2, RN: 2, PB: 2, GO: 2, TO: 2,
  AP: 2, RJ: 2, SP: 2, MT: 1, MS: 1, ES: 1, PR: 1, SC: 1, RS: 1, AM: 1, RO: 1, RR: 0, AC: 0, DF: 0,
};
const OPACITY = [0.12, 0.28, 0.44, 0.6, 0.76, 0.92];

export function PanelPreview() {
  return (
    <div className="relative" aria-hidden="true">
      <div className="absolute -inset-6 rounded-[28px] bg-gradient-to-br from-gold/10 via-transparent to-brand-500/10 blur-2xl" />
      <div className="relative rounded-2xl border border-ink-700 bg-ink-900 shadow-xl overflow-hidden">
        {/* barra da janela */}
        <div className="flex items-center gap-1.5 px-4 h-9 border-b border-ink-700 bg-ink-800/60">
          <span className="w-2.5 h-2.5 rounded-full bg-ink-600" />
          <span className="w-2.5 h-2.5 rounded-full bg-ink-600" />
          <span className="w-2.5 h-2.5 rounded-full bg-ink-600" />
          <span className="ml-3 h-5 flex-1 max-w-[16rem] rounded bg-ink-900 border border-ink-700 text-[10px] text-ink-500 flex items-center px-2 font-mono">dataº/d/escolas-em-territorio</span>
        </div>

        <div className="bg-brand-700 text-white/80 text-[10px] px-5 h-6 flex items-center justify-between">
          <span><b className="text-white">Painel de pesquisa</b> · Educação em territórios</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-white" /> ao vivo</span>
        </div>

        <div className="px-5 pt-5 pb-4 border-b border-ink-700">
          <div className="border-l-[3px] border-gold pl-3">
            <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-gold">Diagnóstico participativo</p>
            <p className="font-serif text-xl font-semibold text-ink-50 leading-tight mt-1">Escolas em territórios tradicionais</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-px bg-ink-700 border-b border-ink-700">
          {[
            ["Respostas", "1.284", "text-ink-50"],
            ["Escolas", "724", "text-brand-400"],
            ["Sem água potável", "31%", "text-coral-500"],
          ].map(([l, v, c]) => (
            <div key={l} className="bg-ink-900 px-4 py-3">
              <p className="text-2xs font-semibold uppercase tracking-[0.1em] text-ink-500">{l}</p>
              <p className={`font-serif text-2xl font-semibold leading-none mt-1.5 tabular ${c}`}>{v}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-4 p-5">
          <div className="col-span-3">
            <p className="text-[11px] font-semibold text-ink-50 mb-2">Respostas por UF</p>
            <svg viewBox={BRAZIL_STATES_VIEWBOX} className="w-full h-auto">
              {Object.entries(BRAZIL_STATES).map(([uf, d]) => (
                <path key={uf} d={d} fill="rgb(var(--color-brand-500))" fillOpacity={OPACITY[SAMPLE[uf] ?? 0]}
                  stroke="rgb(var(--color-ink-900))" strokeWidth={1.2} strokeLinejoin="round" />
              ))}
            </svg>
            <div className="mt-2 flex items-center gap-1">
              {OPACITY.map(o => <span key={o} className="h-1.5 flex-1 rounded-sm" style={{ background: `rgb(var(--color-brand-500) / ${o})` }} />)}
            </div>
          </div>
          <div className="col-span-2 flex flex-col">
            <p className="text-[11px] font-semibold text-ink-50 mb-3">Infraestrutura</p>
            <div className="space-y-2.5">
              {[["Energia", 88, "brand"], ["Internet", 54, "gold"], ["Biblioteca", 39, "gold"], ["Água potável", 69, "brand"], ["Quadra", 22, "coral"]].map(([l, v, t]) => (
                <div key={l as string}>
                  <div className="flex justify-between text-[10px] text-ink-300"><span>{l}</span><span className="font-semibold tabular text-ink-100">{v}%</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-ink-800 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${v}%`, background: t === "brand" ? "rgb(var(--color-brand-500))" : t === "gold" ? "rgb(var(--color-gold))" : "rgb(var(--color-coral-500))" }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-auto pt-4 text-2xs italic text-ink-500">Dados ilustrativos</p>
          </div>
        </div>
      </div>
    </div>
  );
}
