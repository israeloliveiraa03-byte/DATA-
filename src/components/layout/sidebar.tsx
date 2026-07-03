"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
    label: "Conta",
    items: [
      { href: "/profile",  icon: "ti-user-circle", label: "Perfil"  },
      { href: "/settings", icon: "ti-settings",    label: "Config." },
    ],
  },
  {
    label: "Produto",
    items: [
      { href: "/design-system", icon: "ti-palette", label: "Design" },
    ],
  },
];

export function PlatformSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-44 flex-shrink-0 py-4 px-2.5 overflow-y-auto flex flex-col bg-ink-950 border-r border-ink-700">
      {nav.map(group => (
        <div key={group.label} className="mb-5">
          <p className="px-2 mb-1.5 font-bold uppercase font-condensed text-ink-500" style={{ fontSize: "9px", letterSpacing: "0.1em" }}>
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map(item => {
              const active = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm font-medium font-condensed transition-colors duration-150 border ${
                      active
                        ? "bg-brand-50/10 text-brand-400 border-brand-500/30"
                        : "text-ink-300 border-transparent hover:bg-ink-900 hover:text-ink-100"
                    }`}
                  >
                    <i className={`ti ${item.icon} text-base ${active ? "text-brand-400" : "text-ink-500"}`} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      {/* Card Dataº Território */}
      <Link href="/territorio"
        className="block mx-1 mb-3 mt-auto p-3 rounded-md transition-colors duration-150 group bg-ink-900 border border-ink-700 hover:border-ink-500">
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
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded font-bold transition-[gap] duration-150 group-hover:gap-1.5 bg-brand-500 text-ink-950"
          style={{ fontSize: "8px" }}>
          Candidatar <i className="ti ti-arrow-right" style={{ fontSize: "8px" }} />
        </span>
      </Link>

      {/* Badge LGPD */}
      <div className="mx-1 px-2 py-2 rounded text-center bg-ink-900 border border-ink-700">
        <i className="ti ti-shield-check text-sm block mb-0.5 text-brand-400" />
        <p className="font-semibold text-ink-300" style={{ fontSize: "8px" }}>LGPD</p>
        <p className="text-ink-500" style={{ fontSize: "7px" }}>Conformidade</p>
      </div>
    </aside>
  );
}
