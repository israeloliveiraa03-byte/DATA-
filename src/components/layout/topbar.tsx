"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { User } from "next-auth";
import { cn } from "@/lib/utils";
import { DataLogo } from "@/components/layout/data-logo";
import { buttonClasses } from "@/components/ui/button";
import { useTheme } from "@/components/theme/theme-provider";
import { SEGMENT_LABELS } from "@/components/layout/nav-config";

function initials(name?: string | null, email?: string | null) {
  const base = (name || email || "?").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}

/** Trilha a partir da URL — ids (uuid/slug longo) viram "Detalhe". */
function useCrumbs() {
  const pathname = usePathname();
  const segs = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];
  let acc = "";
  for (const seg of segs) {
    acc += "/" + seg;
    const label = SEGMENT_LABELS[seg] ?? (/^[0-9a-f-]{16,}$/i.test(seg) || seg.length > 24 ? "Detalhe" : decodeURIComponent(seg));
    crumbs.push({ label, href: acc });
  }
  return crumbs;
}

function ThemeToggle() {
  const { colorMode, setColorMode } = useTheme();
  const [systemDark, setSystemDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const on = () => setSystemDark(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const resolved: "light" | "dark" = colorMode === "system" ? (systemDark ? "dark" : "light") : colorMode;
  const next = resolved === "dark" ? "light" : "dark";
  return (
    <button
      onClick={() => setColorMode(next)}
      aria-label={next === "dark" ? "Ativar tema escuro" : "Ativar tema claro"}
      title={next === "dark" ? "Tema escuro" : "Tema claro"}
      className="flex h-9 w-9 items-center justify-center rounded-md text-ink-500 hover:bg-ink-800 hover:text-ink-100 transition-colors"
    >
      <i className={cn("ti text-lg", resolved === "dark" ? "ti-sun" : "ti-moon")} aria-hidden="true" />
    </button>
  );
}

function UserMenu({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full pl-1 pr-2 h-9 hover:bg-ink-800 transition-colors"
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar do provedor OAuth, domínio externo variável
          <img src={user.image} alt="" className="h-7 w-7 rounded-full object-cover border border-ink-700" referrerPolicy="no-referrer" />
        ) : (
          <span className="h-7 w-7 rounded-full bg-brand-500 text-on-accent text-2xs font-bold flex items-center justify-center">
            {initials(user.name, user.email)}
          </span>
        )}
        <i className="ti ti-chevron-down text-xs text-ink-500 hidden sm:block" aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-64 rounded-xl border border-ink-700 bg-ink-900 shadow-lg p-1.5 z-50 animate-fade-in">
          <div className="px-3 py-2.5 border-b border-ink-700 mb-1">
            <p className="text-sm font-semibold text-ink-50 truncate">{user.name ?? "Pesquisador(a)"}</p>
            <p className="text-xs text-ink-500 truncate">{user.email}</p>
          </div>
          {[
            { href: "/profile", icon: "ti-user-circle", label: "Meu perfil" },
            { href: "/settings", icon: "ti-adjustments-horizontal", label: "Preferências e acessibilidade" },
            { href: "/suporte", icon: "ti-lifebuoy", label: "Suporte" },
          ].map(i => (
            <Link key={i.href} href={i.href} role="menuitem" onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-ink-300 hover:bg-ink-800 hover:text-ink-50">
              <i className={cn("ti", i.icon, "text-base text-ink-500")} aria-hidden="true" /> {i.label}
            </Link>
          ))}
          <div className="my-1 h-px bg-ink-700" />
          <button role="menuitem" onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-coral-500 hover:bg-coral-50">
            <i className="ti ti-logout text-base" aria-hidden="true" /> Sair
          </button>
        </div>
      )}
    </div>
  );
}

export function PlatformTopbar({ user, onOpenMenu, onOpenSearch }: { user: User; onOpenMenu?: () => void; onOpenSearch?: () => void }) {
  const crumbs = useCrumbs();
  const pathname = usePathname();
  // Páginas que já têm o próprio botão de criar não repetem no topo.
  const showNewResearch = !["/dashboard", "/researches", "/researches/new"].includes(pathname) && !pathname.startsWith("/preview-harness");

  return (
    <header className="sticky top-0 z-40 h-14 flex-shrink-0 border-b border-ink-700 bg-ink-950/85 backdrop-blur supports-[backdrop-filter]:bg-ink-950/70">
      <div className="h-full flex items-center gap-3 px-4 sm:px-6">
        <button onClick={onOpenMenu} aria-label="Abrir menu"
          className="lg:hidden -ml-1 flex h-9 w-9 items-center justify-center rounded-md text-ink-300 hover:bg-ink-800">
          <i className="ti ti-menu-2 text-xl" aria-hidden="true" />
        </button>
        <Link href="/dashboard" className="lg:hidden text-ink-50" aria-label="Dataº — início">
          <DataLogo className="text-xl" />
        </Link>

        <nav aria-label="Você está em" className="hidden lg:flex min-w-0 items-center gap-1.5 text-sm">
          {crumbs.map((c, i) => (
            <span key={c.href} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && <i className="ti ti-chevron-right text-xs text-ink-600" aria-hidden="true" />}
              {i === crumbs.length - 1 ? (
                <span className="font-medium text-ink-50 truncate">{c.label}</span>
              ) : (
                <Link href={c.href} className="text-ink-500 hover:text-ink-100 truncate">{c.label}</Link>
              )}
            </span>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          <button onClick={onOpenSearch} aria-label="Busca rápida (Ctrl+K)"
            className="hidden md:flex h-9 w-64 items-center gap-2 rounded-md border border-ink-700 bg-ink-900 px-3 text-sm text-ink-500 shadow-xs hover:border-ink-600 transition-colors mr-1">
            <i className="ti ti-search" aria-hidden="true" />
            <span className="flex-1 text-left">Buscar…</span>
            <kbd className="rounded border border-ink-700 bg-ink-800 px-1.5 font-mono text-2xs">⌘K</kbd>
          </button>
          <button onClick={onOpenSearch} aria-label="Busca rápida"
            className="md:hidden flex h-9 w-9 items-center justify-center rounded-md text-ink-500 hover:bg-ink-800 hover:text-ink-100">
            <i className="ti ti-search text-lg" aria-hidden="true" />
          </button>
          {showNewResearch && (
            <Link href="/researches/new" className={buttonClasses("primary", "sm", "hidden sm:inline-flex mr-1")}>
              <i className="ti ti-plus text-sm" aria-hidden="true" /> Nova pesquisa
            </Link>
          )}
          <Link href="/suporte" title="Ajuda e suporte" aria-label="Ajuda e suporte"
            className="flex h-9 w-9 items-center justify-center rounded-md text-ink-500 hover:bg-ink-800 hover:text-ink-100 transition-colors">
            <i className="ti ti-help-circle text-lg" aria-hidden="true" />
          </Link>
          <ThemeToggle />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
