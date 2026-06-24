"use client";
import { useState, useEffect } from "react";
import type { IBGEState, IBGECity } from "@/lib/types";

export function useStates() {
  const [states,  setStates]  = useState<IBGEState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/geo?type=states").then(r => r.json())
      .then(res => { if (res.success) setStates(res.data); else setError(res.error); })
      .catch(() => setError("Erro ao carregar estados"))
      .finally(() => setLoading(false));
  }, []);

  return { states, loading, error };
}

export function useCities(stateCode: string | null) {
  const [cities,  setCities]  = useState<IBGECity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!stateCode) { setCities([]); return; }
    setLoading(true); setCities([]);
    fetch(`/api/geo?type=cities&state=${stateCode}`).then(r => r.json())
      .then(res => { if (res.success) setCities(res.data); else setError(res.error); })
      .catch(() => setError("Erro ao carregar municípios"))
      .finally(() => setLoading(false));
  }, [stateCode]);

  return { cities, loading, error };
}
