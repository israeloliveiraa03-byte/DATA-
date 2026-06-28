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
];

export function PlatformSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-44 flex-shrink-0 py-4 px-2.5 overflow-y-auto flex flex-col"
      style={{ background: "#faf6ef", borderRight: "1px solid #e8d9c0" }}
    >
      {nav.map(group => (
        <div key={group.label} className="mb-5">
          <p className="px-2 mb-1.5 text-xs font-bold uppercase tracking-widest"
            style={{ color: "#b07d20", fontSize: "9px", letterSpacing: "0.1em" }}>
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map(item => {
              const active = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-medium transition-colors"
                    style={{
                      background: active ? "#fff8ec" : "transparent",
                      color:      active ? "#7a3d00" : "#5c4a2a",
                      border:     active ? "1px solid #d4b880" : "1px solid transparent",
                    }}
                  >
                    <i className={`ti ${item.icon} text-base`}
                      style={{ color: active ? "#b07d20" : "#8b7355" }} />
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
        className="block mx-1 mb-3 mt-auto p-3 rounded-lg transition-all group"
        style={{ background: "linear-gradient(135deg, #1c1b18, #2d2926)", border: "1px solid #3d3833" }}>
        <div className="flex items-center gap-1.5 mb-1.5">
          <i className="ti ti-heart-handshake text-sm" style={{ color: "#c4a35a" }} />
          <span className="font-bold uppercase tracking-widest" style={{ fontSize: "8px", color: "#c4a35a", letterSpacing: "0.1em" }}>
            Programa social
          </span>
        </div>
        <p className="font-bold mb-1 leading-tight" style={{ fontSize: "11px", color: "#f0e6d0", fontFamily: "Georgia, serif" }}>
          Dataº Território
        </p>
        <p className="leading-snug mb-2" style={{ fontSize: "8px", color: "rgba(240,230,208,0.6)" }}>
          Acesso gratuito para comunidades tradicionais
        </p>
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded font-bold transition-all group-hover:gap-1.5"
          style={{ fontSize: "8px", background: "#b07d20", color: "#fff" }}>
          Candidatar <i className="ti ti-arrow-right" style={{ fontSize: "8px" }} />
        </span>
      </Link>

      {/* Badge LGPD */}
      <div className="mx-1 px-2 py-2 rounded-md text-center"
        style={{ background: "#fff8ec", border: "1px solid #e8d9c0" }}>
        <i className="ti ti-shield-check text-sm block mb-0.5" style={{ color: "#b07d20" }} />
        <p className="font-semibold" style={{ fontSize: "8px", color: "#5c4a2a" }}>LGPD</p>
        <p style={{ fontSize: "7px", color: "#8b7355" }}>Conformidade</p>
      </div>
    </aside>
  );
}
