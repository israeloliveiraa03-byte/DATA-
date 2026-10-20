import { cn } from "@/lib/utils";

// Capa gerada para pesquisas sem imagem: curvas de nível (como numa carta
// topográfica) com semente no id — cada pesquisa tem um desenho próprio e
// estável, na cor do tema da pesquisa. Substitui o ícone de "foto vazia".

const THEME_TONE: Record<string, string> = {
  health: "--color-coral-500",
  education: "--color-teal-500",
  environment: "--color-brand-500",
  culture: "--color-purple-500",
  economy: "--color-amber-500",
  governance: "--color-chart-6",
  territory: "--color-brand-500",
  other: "--color-gold",
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function rng(seed: number) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function ResearchCover({ id, theme, image, className }: { id: string; theme?: string | null; image?: string | null; className?: string }) {
  if (image) {
    return (
      <div className={cn("relative overflow-hidden bg-ink-800", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- capa enviada pelo pesquisador, URL externa */}
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
      </div>
    );
  }
  const tone = THEME_TONE[theme ?? "other"] ?? THEME_TONE.other;
  const r = rng(hash(id));
  const cx = 160 + r() * 480;
  const cy = 30 + r() * 100;
  const rings = 12;
  const paths: string[] = [];
  for (let k = 1; k <= rings; k++) {
    const base = k * 20;
    const pts: string[] = [];
    const n = 28;
    const wob = 0.12 + r() * 0.1;
    const phase = r() * Math.PI * 2;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rad = base * (1 + wob * Math.sin(3 * a + phase) + 0.05 * Math.cos(5 * a + k));
      pts.push(`${(cx + Math.cos(a) * rad * 1.6).toFixed(1)},${(cy + Math.sin(a) * rad).toFixed(1)}`);
    }
    paths.push(`M${pts.join("L")}Z`);
  }
  return (
    <div className={cn("relative overflow-hidden", className)} style={{ background: `rgb(var(${tone}) / 0.08)` }}>
      <svg viewBox="0 0 800 160" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {paths.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={`rgb(var(${tone}))`} strokeOpacity={0.18 + (i % 3 === 0 ? 0.16 : 0)} strokeWidth={i % 3 === 0 ? 1.2 : 0.7} />
        ))}
        <circle cx={cx} cy={cy} r="3.5" fill={`rgb(var(${tone}))`} fillOpacity="0.7" />
      </svg>
    </div>
  );
}
