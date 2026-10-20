"use client";

import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme/theme-provider";

const SIZES = ["default", "large", "xlarge"] as const;

const btn = "flex-1 h-9 rounded-md border border-ink-700 bg-ink-900 text-xs font-semibold text-ink-300 transition-colors hover:border-ink-600 hover:text-ink-50 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-1.5";

export function AccessibilityControls() {
  const { contrast, textSize, setContrast, setTextSize } = useTheme();

  function bumpTextSize(direction: 1 | -1) {
    const idx = SIZES.indexOf(textSize);
    const next = SIZES[Math.min(SIZES.length - 1, Math.max(0, idx + direction))];
    setTextSize(next);
  }

  return (
    <div className="flex gap-2">
      <button type="button" aria-label="Alternar alto contraste" aria-pressed={contrast === "high"}
        onClick={() => setContrast(contrast === "high" ? "normal" : "high")}
        className={cn(btn, contrast === "high" && "border-brand-500 bg-brand-50 text-brand-400")}>
        <i className="ti ti-contrast" aria-hidden="true" /> Contraste
      </button>
      <button type="button" aria-label="Aumentar fonte" onClick={() => bumpTextSize(1)} disabled={textSize === "xlarge"} className={btn}>
        A+
      </button>
      <button type="button" aria-label="Diminuir fonte" onClick={() => bumpTextSize(-1)} disabled={textSize === "default"} className={btn}>
        A−
      </button>
    </div>
  );
}
