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
    <aside className="w-44 flex-shrink-0 py-4 px-2.5 overflow-y-auto flex flex-col bg-white border-r border-slate-200">
      {nav.map(group => (
        <div key={group.label} className="mb-5">
          <p className="px-2 mb-1.5 font-bold uppercase text-slate-400" style={{ fontSize: "9px", letterSpacing: "0.1em" }}>
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map(item => {
              const active = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-medium transition-colors border ${
                      active
                        ? "bg-brand-50 text-brand-700 border-brand-100"
                        : "text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <i className={`ti ${item.icon} text-base ${active ? "text-brand-600" : "text-slate-400"}`} />
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
        className="block mx-1 mb-3 mt-auto p-3 rounded-lg transition-all group bg-slate-900 border border-slate-800 hover:border-slate-700">
        <div className="flex items-center gap-1.5 mb-1.5">
          <i className="ti ti-heart-handshake text-sm text-teal-500" />
          <span className="font-bold uppercase text-teal-500" style={{ fontSize: "8px", letterSpacing: "0.1em" }}>
            Programa social
          </span>
        </div>
        <p className="font-bold mb-1 leading-tight text-white" style={{ fontSize: "11px" }}>
          Dataº Território
        </p>
        <p className="leading-snug mb-2 text-slate-400" style={{ fontSize: "8px" }}>
          Acesso gratuito para comunidades tradicionais
        </p>
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded font-bold transition-all group-hover:gap-1.5 bg-brand-500 text-white"
          style={{ fontSize: "8px" }}>
          Candidatar <i className="ti ti-arrow-right" style={{ fontSize: "8px" }} />
        </span>
      </Link>

      {/* Badge LGPD */}
      <div className="mx-1 px-2 py-2 rounded-md text-center bg-slate-50 border border-slate-200">
        <i className="ti ti-shield-check text-sm block mb-0.5 text-brand-600" />
        <p className="font-semibold text-slate-600" style={{ fontSize: "8px" }}>LGPD</p>
        <p className="text-slate-400" style={{ fontSize: "7px" }}>Conformidade</p>
      </div>
    </aside>
  );
}
