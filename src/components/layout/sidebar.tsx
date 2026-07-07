"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const nav = [
  {
    label: "Geral",
    items: [
      { href: "/dashboard",  icon: "ti-home", label: "Início"  },
      { href: "/researches", icon: "ti-clipboard-list",   label: "Pesquisas"  },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { href: "/entidades", icon: "ti-database", label: "Entidades" },
    ],
  },
  {
    label: "Rede",
    items: [
      { href: "/notas-tecnicas", icon: "ti-notebook", label: "Notas técnicas" },
      { href: "/colaboracao",    icon: "ti-hand-heart", label: "Colaboração" },
    ],
  },
  {
    label: "Conta",
    items: [
      { href: "/profile",  icon: "ti-user-circle", label: "Perfil"  },
      { href: "/settings", icon: "ti-settings",    label: "Config." },
      { href: "/suporte",  icon: "ti-headset",     label: "Suporte" },
    ],
  },
  {
    label: "Produto",
    items: [
      { href: "/design-system", icon: "ti-palette", label: "Design" },
    ],
  },
];

const STORAGE_KEY = "dataz-sidebar-collapsed";

export function PlatformSidebar({ role }: { role?: string } = {}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const isStaff = role === "admin" || role === "support";
  const navGroups = isStaff
    ? [...nav, { label: "Interno", items: [{ href: "/admin", icon: "ti-shield-lock", label: "Admin" }] }]
    : nav;

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  function toggle() {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <aside className={cn(
      "flex-shrink-0 py-4 px-2.5 overflow-y-auto flex flex-col bg-ink-950 border-r border-ink-700 transition-[width] duration-150 ease-out",
      collapsed ? "w-14" : "w-44",
    )}>
      <button
        onClick={toggle}
        title={collapsed ? "Expandir menu" : "Recolher menu"}
        className={cn(
          "flex items-center gap-2 mb-4 px-2 py-1.5 rounded text-ink-500 hover:text-ink-100 hover:bg-ink-900 transition-colors duration-150",
          collapsed ? "justify-center" : "justify-end",
        )}
      >
        <i className={`ti ${collapsed ? "ti-chevron-right" : "ti-chevron-left"} text-base`} />
      </button>

      {navGroups.map(group => (
        <div key={group.label} className="mb-5">
          {!collapsed && (
            <p className="px-2 mb-1.5 font-bold uppercase font-condensed text-ink-500" style={{ fontSize: "9px", letterSpacing: "0.1em" }}>
              {group.label}
            </p>
          )}
          <ul className="space-y-0.5">
            {group.items.map(item => {
              const active = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1.5 rounded text-sm font-medium font-condensed transition-colors duration-150 border",
                      collapsed && "justify-center",
                      active
                        ? "bg-brand-50/10 text-brand-400 border-brand-500/30"
                        : "text-ink-300 border-transparent hover:bg-ink-900 hover:text-ink-100",
                    )}
                  >
                    <i className={`ti ${item.icon} text-base flex-shrink-0 ${active ? "text-brand-400" : "text-ink-500"}`} />
                    {!collapsed && item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {/* Card Dataº Território */}
      <Link href="/territorio"
        title={collapsed ? "Dataº Território" : undefined}
        className={cn(
          "block mx-1 mb-3 mt-auto rounded-md transition-colors duration-150 group bg-ink-900 border border-ink-700 hover:border-ink-500",
          collapsed ? "p-2 flex justify-center" : "p-3",
        )}>
        {collapsed ? (
          <i className="ti ti-heart-handshake text-base text-brand-400" />
        ) : (
          <>
            <div className="flex items-center gap-1.5 mb-1.5">
              <i className="ti ti-heart-handshake text-sm text-brand-400" />
              <span className="font-bold uppercase font-condensed text-brand-400" style={{ fontSize: "8px", letterSpacing: "0.1em" }}>
                Programa social
              </span>
            </div>
            <p className="font-bold mb-1 leading-tight text-ink-100" style={{ fontSize: "11px" }}>
              Dataº Território
            </p>
            <p className="leading-snug mb-2 text-ink-300" style={{ fontSize: "8px" }}>
              Acesso gratuito para comunidades tradicionais
            </p>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded font-bold transition-[gap] duration-150 group-hover:gap-1.5 bg-brand-500 text-on-accent"
              style={{ fontSize: "8px" }}>
              Candidatar <i className="ti ti-arrow-right" style={{ fontSize: "8px" }} />
            </span>
          </>
        )}
      </Link>

      {/* Badge LGPD */}
      <div
        title={collapsed ? "LGPD — Conformidade" : undefined}
        className={cn("mx-1 rounded text-center bg-ink-900 border border-ink-700", collapsed ? "py-2" : "px-2 py-2")}
      >
        <i className="ti ti-shield-check text-sm block mb-0.5 text-brand-400" />
        {!collapsed && (
          <>
            <p className="font-semibold text-ink-300" style={{ fontSize: "8px" }}>LGPD</p>
            <p className="text-ink-500" style={{ fontSize: "7px" }}>Conformidade</p>
          </>
        )}
      </div>
    </aside>
  );
}
