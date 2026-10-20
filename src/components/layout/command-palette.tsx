"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme/theme-provider";
import { NAV_GROUPS, STAFF_GROUP } from "@/components/layout/nav-config";

// Busca rápida global (⌘K / Ctrl+K): ir para qualquer tela, abrir uma
// pesquisa ou entidade pelo nome e executar ações comuns sem usar o mouse.
// Pesquisas vêm de GET /api/researches e entidades de /api/entities/search
// — buscados só quando a paleta abre, nunca no carregamento da página.

interface Item {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: string;
  keywords?: string;
  run: () => void;
}

function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return { open, setOpen };
}

export function CommandPalette({ open, onClose, role }: { open: boolean; onClose: () => void; role?: string }) {
  const router = useRouter();
  const { setColorMode, colorMode } = useTheme();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [researches, setResearches] = useState<{ id: string; title: string; status: string; cityName: string | null }[]>([]);
  const [entities, setEntities] = useState<{ id: string; code: string; name: string; cityName: string | null; stateCode: string | null }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const go = useCallback((href: string) => { onClose(); router.push(href); }, [onClose, router]);

  // Carrega pesquisas uma vez por abertura
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    setTimeout(() => inputRef.current?.focus(), 10);
    let cancel = false;
    fetch("/api/researches").then(r => r.ok ? r.json() : null).then(j => { if (!cancel && j?.data) setResearches(j.data); }).catch(() => {});
    return () => { cancel = true; };
  }, [open]);

  // Entidades: busca no servidor conforme digita (com pequena espera)
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) { setEntities([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/entities/search?q=${encodeURIComponent(q)}`).then(r => r.ok ? r.json() : null).then(j => { if (j?.data) setEntities(j.data.slice(0, 6)); }).catch(() => {});
    }, 180);
    return () => clearTimeout(t);
  }, [query, open]);

  const items: Item[] = useMemo(() => {
    const isStaff = role === "admin" || role === "support";
    const groups = isStaff ? [...NAV_GROUPS, STAFF_GROUP] : NAV_GROUPS;
    const actions: Item[] = [
      { id: "a-new", group: "Ações", label: "Criar nova pesquisa", icon: "ti-plus", keywords: "nova pesquisa criar instrumento", run: () => go("/researches/new") },
      { id: "a-ent", group: "Ações", label: "Cadastrar entidade", hint: "Comunidade, escola, território…", icon: "ti-map-pin-plus", keywords: "nova entidade comunidade escola territorio", run: () => go("/entidades/nova") },
      { id: "a-theme", group: "Ações", label: colorMode === "dark" ? "Usar tema claro" : "Usar tema escuro", icon: colorMode === "dark" ? "ti-sun" : "ti-moon", keywords: "tema escuro claro modo cor", run: () => { setColorMode(colorMode === "dark" ? "light" : "dark"); onClose(); } },
      { id: "a-help", group: "Ações", label: "Abrir chamado de suporte", icon: "ti-lifebuoy", keywords: "ajuda suporte problema", run: () => go("/suporte") },
    ];
    const nav: Item[] = groups.flatMap(g => g.items.map(i => ({
      id: "n-" + i.href, group: "Ir para", label: i.label, hint: g.label, icon: i.icon, keywords: i.href, run: () => go(i.href),
    })));
    const res: Item[] = researches.map(r => ({
      id: "r-" + r.id, group: "Pesquisas", label: r.title, hint: r.cityName ?? undefined, icon: "ti-clipboard-data", run: () => go(`/researches/${r.id}`),
    }));
    const ent: Item[] = entities.map(e => ({
      id: "e-" + e.id, group: "Entidades", label: e.name, hint: [e.code, e.cityName, e.stateCode].filter(Boolean).join(" · "), icon: "ti-database", keywords: e.code, run: () => go(`/entidades/${e.id}`),
    }));
    const all = [...actions, ...res, ...ent, ...nav];
    const q = normalize(query.trim());
    if (!q) return [...actions, ...res.slice(0, 5), ...nav];
    return all.filter(i => normalize(`${i.label} ${i.hint ?? ""} ${i.keywords ?? ""}`).includes(q));
  }, [query, researches, entities, role, go, colorMode, setColorMode, onClose]);

  useEffect(() => { setActive(0); }, [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(items.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); items[active]?.run(); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  }

  let lastGroup = "";
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Busca rápida">
      <button className="absolute inset-0 bg-black/45 backdrop-blur-[2px] animate-fade-in" onClick={onClose} aria-label="Fechar busca" tabIndex={-1} />
      <div className="relative w-full max-w-xl rounded-2xl border border-ink-700 bg-ink-900 shadow-xl overflow-hidden animate-fade-in" onKeyDown={onKeyDown}>
        <div className="flex items-center gap-3 px-4 border-b border-ink-700">
          <i className="ti ti-search text-lg text-ink-500" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar pesquisa, entidade ou tela…"
            aria-label="Buscar"
            role="combobox"
            aria-expanded="true"
            aria-controls="busca-rapida-lista"
            aria-activedescendant={items[active] ? `cmd-${items[active].id}` : undefined}
            className="h-14 flex-1 bg-transparent text-base text-ink-50 placeholder:text-ink-500 border-0 focus:ring-0 focus:outline-none px-0"
          />
          <kbd className="hidden sm:inline-flex h-6 items-center rounded border border-ink-700 bg-ink-800 px-1.5 font-mono text-2xs text-ink-500">Esc</kbd>
        </div>
        <div ref={listRef} id="busca-rapida-lista" role="listbox" className="max-h-[52vh] overflow-y-auto p-2">
          {items.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-ink-500">Nada encontrado para “{query}”.</p>
          )}
          {items.map((it, i) => {
            const header = it.group !== lastGroup ? it.group : null;
            lastGroup = it.group;
            return (
              <div key={it.id}>
                {header && <p className="px-3 pt-3 pb-1.5 text-2xs font-semibold uppercase tracking-[0.12em] text-ink-500">{header}</p>}
                <button
                  id={`cmd-${it.id}`}
                  data-index={i}
                  role="option"
                  aria-selected={i === active}
                  onMouseMove={() => setActive(i)}
                  onClick={() => it.run()}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                    i === active ? "bg-brand-50 text-ink-50" : "text-ink-100",
                  )}
                >
                  <span className={cn("w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 border", i === active ? "border-brand-500/30 bg-ink-900 text-brand-500" : "border-ink-700 bg-ink-800 text-ink-500")}>
                    <i className={cn("ti", it.icon, "text-base")} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium truncate">{it.label}</span>
                    {it.hint && <span className="block text-xs text-ink-500 truncate">{it.hint}</span>}
                  </span>
                  {i === active && <i className="ti ti-corner-down-left text-sm text-ink-500" aria-hidden="true" />}
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 border-t border-ink-700 bg-ink-800/50 px-4 py-2 text-2xs text-ink-500">
          <span className="inline-flex items-center gap-1"><kbd className="font-mono">↑↓</kbd> navegar</span>
          <span className="inline-flex items-center gap-1"><kbd className="font-mono">↵</kbd> abrir</span>
          <span className="ml-auto inline-flex items-center gap-1"><kbd className="font-mono">⌘K</kbd> / <kbd className="font-mono">Ctrl K</kbd></span>
        </div>
      </div>
    </div>
  );
}
