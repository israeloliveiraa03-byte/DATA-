"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { DataLogo } from "@/components/layout/data-logo";
import { NAV_GROUPS, STAFF_GROUP, isActive, type NavGroup } from "@/components/layout/nav-config";

const STORAGE_KEY = "dataz-sidebar-collapsed";

function NavList({ groups, collapsed, onNavigate }: { groups: NavGroup[]; collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegação principal" className="flex-1 overflow-y-auto px-3 py-2">
      {groups.map(group => (
        <div key={group.label} className="mb-5 last:mb-2">
          {collapsed ? (
            <div className="mx-auto my-2 h-px w-6 bg-ink-700" aria-hidden="true" />
          ) : (
            <p className="px-2.5 mb-1.5 text-2xs font-semibold uppercase tracking-[0.12em] text-ink-500">{group.label}</p>
          )}
          <ul className="space-y-0.5">
            {group.items.map(item => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-md text-sm font-medium transition-colors duration-150",
                      collapsed ? "justify-center h-10 w-10 mx-auto" : "h-9 px-2.5",
                      active
                        ? "bg-brand-50 text-brand-400"
                        : "text-ink-300 hover:bg-ink-800 hover:text-ink-50",
                    )}
                  >
                    {active && !collapsed && <span className="absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-brand-500" aria-hidden="true" />}
                    <i className={cn("ti", item.icon, "text-[1.15rem] flex-shrink-0", active ? "text-brand-500" : "text-ink-500 group-hover:text-ink-300")} aria-hidden="true" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function TerritorioCard({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    return (
      <Link href="/territorio" title="Dataº Território — acesso gratuito para comunidades tradicionais"
        className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-md text-gold hover:bg-ink-800 transition-colors">
        <i className="ti ti-plant-2 text-lg" aria-hidden="true" />
      </Link>
    );
  }
  return (
    <Link href="/territorio"
      className="group mx-3 mb-3 block rounded-lg border border-ink-700 bg-ink-800/60 p-3.5 transition-colors hover:border-ink-600 hover:bg-ink-800">
      <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.12em] text-gold">
        <i className="ti ti-plant-2 text-sm" aria-hidden="true" /> Programa social
      </p>
      <p className="mt-1.5 font-serif text-base font-semibold text-ink-50 leading-tight">Dataº Território</p>
      <p className="mt-1 text-xs text-ink-300 leading-snug">Acesso gratuito para organizações de comunidades tradicionais.</p>
      <span className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-brand-400 transition-[gap] group-hover:gap-1.5">
        Candidatar organização <i className="ti ti-arrow-right text-xs" aria-hidden="true" />
      </span>
    </Link>
  );
}

/** Barra lateral fixa (desktop). */
export function PlatformSidebar({ role }: { role?: string } = {}) {
  const [collapsed, setCollapsed] = useState(false);
  const isStaff = role === "admin" || role === "support";
  const groups = isStaff ? [...NAV_GROUPS, STAFF_GROUP] : NAV_GROUPS;

  useEffect(() => {
    try { setCollapsed(localStorage.getItem(STORAGE_KEY) === "1"); } catch {}
  }, []);

  function toggle() {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, next ? "1" : "0"); } catch {}
      return next;
    });
  }

  return (
    <aside className={cn(
      "hidden lg:flex sticky top-0 h-dvh flex-shrink-0 flex-col border-r border-ink-700 bg-ink-900 transition-[width] duration-200 ease-out",
      collapsed ? "w-[68px]" : "w-[248px]",
    )}>
      <div className={cn("flex h-14 items-center border-b border-ink-700 flex-shrink-0", collapsed ? "justify-center px-2" : "justify-between pl-5 pr-2")}>
        {!collapsed && (
          <Link href="/dashboard" className="text-ink-50" aria-label="Dataº — início">
            <DataLogo className="text-[1.35rem]" />
          </Link>
        )}
        <button
          onClick={toggle}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          className="flex h-8 w-8 items-center justify-center rounded-md text-ink-500 hover:bg-ink-800 hover:text-ink-100 transition-colors"
        >
          <i className={cn("ti text-lg", collapsed ? "ti-layout-sidebar-left-expand" : "ti-layout-sidebar-left-collapse")} aria-hidden="true" />
        </button>
      </div>

      <div className="pt-3 flex-1 min-h-0 flex flex-col">
        <NavList groups={groups} collapsed={collapsed} />
      </div>

      <TerritorioCard collapsed={collapsed} />

      <div className={cn("border-t border-ink-700 py-3 flex items-center gap-2 text-2xs text-ink-500 flex-shrink-0", collapsed ? "justify-center" : "px-5")}>
        <i className="ti ti-shield-check text-sm text-brand-500" aria-hidden="true" />
        {!collapsed && <span>Dados protegidos · LGPD (Lei nº 13.709/2018)</span>}
      </div>
    </aside>
  );
}

/** Gaveta de navegação no celular/tablet. */
export function MobileNav({ open, onClose, role }: { open: boolean; onClose: () => void; role?: string }) {
  const isStaff = role === "admin" || role === "support";
  const groups = isStaff ? [...NAV_GROUPS, STAFF_GROUP] : NAV_GROUPS;
  const pathname = usePathname();

  // Fecha a gaveta ao trocar de rota e com Esc
  useEffect(() => { onClose(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="lg:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Menu">
      <button className="absolute inset-0 bg-black/45 backdrop-blur-[2px] animate-fade-in" onClick={onClose} aria-label="Fechar menu" />
      <div className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] bg-ink-900 border-r border-ink-700 shadow-xl flex flex-col animate-slide-in-left">
        <div className="flex h-14 items-center justify-between pl-5 pr-2 border-b border-ink-700">
          <DataLogo className="text-[1.35rem] text-ink-50" />
          <button onClick={onClose} aria-label="Fechar menu" className="flex h-9 w-9 items-center justify-center rounded-md text-ink-500 hover:bg-ink-800 hover:text-ink-100">
            <i className="ti ti-x text-lg" aria-hidden="true" />
          </button>
        </div>
        <div className="pt-3 flex-1 min-h-0 flex flex-col">
          <NavList groups={groups} collapsed={false} onNavigate={onClose} />
        </div>
        <TerritorioCard collapsed={false} />
      </div>
    </div>
  );
}
