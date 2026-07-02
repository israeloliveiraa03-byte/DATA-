"use client";

import { useState } from "react";
import { useStates, useCities } from "@/lib/hooks/use-geo";
import { Button } from "@/components/ui/button";

export interface MunicipalityValue {
  stateCode: string;
  cityCode:  string;
  cityName:  string;
}

interface MunicipalityPickerProps {
  value: MunicipalityValue[];
  onChange: (value: MunicipalityValue[]) => void;
}

export function MunicipalityPicker({ value, onChange }: MunicipalityPickerProps) {
  const [stateCode, setStateCode] = useState("");
  const [cityCode,  setCityCode]  = useState("");
  const { states } = useStates();
  const { cities }  = useCities(stateCode || null);

  function addCity() {
    const city = cities.find(c => String(c.id) === cityCode);
    if (!city || !stateCode) return;
    if (value.some(v => v.cityCode === cityCode)) return;
    onChange([...value, { stateCode, cityCode, cityName: city.nome }]);
    setCityCode("");
  }

  function removeCity(code: string) {
    onChange(value.filter(v => v.cityCode !== code));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <select
          value={stateCode}
          onChange={e => { setStateCode(e.target.value); setCityCode(""); }}
          className="rounded-lg border border-gray-200 px-2.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">UF...</option>
          {states.map(s => <option key={s.sigla} value={s.sigla}>{s.sigla}</option>)}
        </select>
        <select
          value={cityCode}
          disabled={!stateCode}
          onChange={e => setCityCode(e.target.value)}
          className="flex-1 rounded-lg border border-gray-200 px-2.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-gray-50"
        >
          <option value="">Município...</option>
          {cities.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <Button type="button" size="sm" variant="secondary" onClick={addCity} disabled={!cityCode}>
          Adicionar
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map(v => (
            <span
              key={v.cityCode}
              className="inline-flex items-center gap-1 rounded-full bg-brand-50 text-brand-700 text-xs px-2.5 py-1"
            >
              {v.cityName}/{v.stateCode}
              <button type="button" onClick={() => removeCity(v.cityCode)} className="hover:text-brand-900" aria-label={`Remover ${v.cityName}`}>
                <i className="ti ti-x text-xs" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
