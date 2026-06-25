"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  {
    label: "Geral",
    items: [
      { href: "/dashboard",  icon: "ti-layout-dashboard", label: "Dashboard"  },
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
      className="w-44 flex-shrink-0 py-4 px-2.5 overflow-y-auto"
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

      {/* Badge LGPD */}
      <div className="mt-auto mx-1 px-2 py-2 rounded-md text-center"
        style={{ background: "#fff8ec", border: "1px solid #e8d9c0" }}>
        <i className="ti ti-shield-check text-sm block mb-0.5" style={{ color: "#b07d20" }} />
        <p className="font-semibold" style={{ fontSize: "8px", color: "#5c4a2a" }}>LGPD</p>
        <p style={{ fontSize: "7px", color: "#8b7355" }}>Conformidade</p>
      </div>
    </aside>
  );
}
