"use client";

import { useTheme } from "@/components/theme/theme-provider";

const SIZES = ["default", "large", "xlarge"] as const;

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
        className="flex-1 h-9 rounded-lg border transition-colors flex items-center justify-center"
        style={contrast === "high"
          ? { borderColor: "#c48a42", background: "#fbf3e7", color: "#7a5218" }
          : { borderColor: "#e2e8f0", color: "#64748b" }}>
        <i className="ti ti-contrast" aria-hidden="true" />
      </button>
      <button type="button" aria-label="Aumentar fonte" onClick={() => bumpTextSize(1)}
        disabled={textSize === "xlarge"}
        className="flex-1 h-9 rounded-lg border text-xs font-semibold text-slate-500 hover:border-brand-300 hover:bg-brand-50 transition-colors disabled:opacity-40"
        style={{ borderColor: "#e2e8f0" }}>
        A+
      </button>
      <button type="button" aria-label="Diminuir fonte" onClick={() => bumpTextSize(-1)}
        disabled={textSize === "default"}
        className="flex-1 h-9 rounded-lg border text-xs font-semibold text-slate-500 hover:border-brand-300 hover:bg-brand-50 transition-colors disabled:opacity-40"
        style={{ borderColor: "#e2e8f0" }}>
        A−
      </button>
    </div>
  );
}
