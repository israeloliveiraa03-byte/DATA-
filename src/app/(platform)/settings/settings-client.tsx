"use client";

import type { ReactNode } from "react";
import { useTheme } from "@/components/theme/theme-provider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

function Segmented<T extends string>({ value, onChange, options }: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-md border border-ink-700 overflow-hidden flex-shrink-0">
      {options.map((opt, i) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-xs font-semibold font-condensed transition-colors duration-150 whitespace-nowrap ${
            value === opt.value
              ? "bg-brand-500 text-on-accent"
              : "bg-ink-900 text-ink-300 hover:bg-ink-800 hover:text-ink-100"
          } ${i > 0 ? "border-l border-ink-700" : ""}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <p className="text-sm font-semibold text-ink-100">{label}</p>
        {hint && <p className="text-xs text-ink-300 mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export function SettingsClient() {
  const {
    colorMode, contrast, textSize, motion, density,
    setColorMode, setContrast, setTextSize, setMotion, setDensity,
  } = useTheme();

  return (
    <div className="flex-1 overflow-auto bg-ink-950">
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold font-condensed text-ink-100" style={{ letterSpacing: "-0.3px" }}>
            Configuração
          </h1>
          <p className="text-sm font-medium mt-0.5 text-ink-300">
            Preferências de aparência — aplicadas na hora, salvas neste dispositivo.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Aparência</CardTitle>
            <CardDescription>Cor, contraste, texto e movimento da interface</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <Row label="Modo de cor" hint="&quot;Sistema&quot; segue a preferência do seu computador">
              <Segmented value={colorMode} onChange={setColorMode} options={[
                { value: "dark",   label: "Escuro" },
                { value: "light",  label: "Claro" },
                { value: "system", label: "Sistema" },
              ]} />
            </Row>

            <Row label="Nível de contraste" hint="Aumenta o contraste de texto e borda">
              <Segmented value={contrast} onChange={setContrast} options={[
                { value: "normal", label: "Normal" },
                { value: "high",   label: "Alto contraste" },
              ]} />
            </Row>

            <Row label="Tamanho do texto">
              <Segmented value={textSize} onChange={setTextSize} options={[
                { value: "default", label: "Padrão" },
                { value: "large",   label: "Grande" },
                { value: "xlarge",  label: "Extra grande" },
              ]} />
            </Row>

            <Row label="Reduzir movimento" hint="Desliga animações mesmo se o sistema não estiver configurado assim">
              <Segmented value={motion} onChange={setMotion} options={[
                { value: "system", label: "Seguir sistema" },
                { value: "reduce", label: "Sempre reduzir" },
              ]} />
            </Row>

            <Row label="Densidade da interface" hint="Compacta reduz espaçamento pra caber mais informação por tela">
              <Segmented value={density} onChange={setDensity} options={[
                { value: "comfortable", label: "Confortável" },
                { value: "compact",     label: "Compacta" },
              ]} />
            </Row>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
