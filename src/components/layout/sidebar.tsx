"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const nav = [
  { label: "Geral",  items: [{ href: "/dashboard",  icon: "ti-layout-dashboard", label: "Dashboard" }, { href: "/researches", icon: "ti-clipboard-list", label: "Pesquisas" }] },
  { label: "Conta",  items: [{ href: "/profile",    icon: "ti-user-circle",      label: "Perfil"     }, { href: "/settings",  icon: "ti-settings",      label: "Config."    }] },
];

export function PlatformSidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-44 flex-shrink-0 border-r border-gray-100 bg-gray-50 py-4 px-2.5">
      {nav.map(group => (
        <div key={group.label} className="mb-4">
          <p className="px-2 mb-1 text-2xs font-medium text-gray-400 uppercase tracking-widest">{group.label}</p>
          <ul className="space-y-0.5">
            {group.items.map(item => (
              <li key={item.href}>
                <Link href={item.href} className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                  pathname.startsWith(item.href) ? "bg-brand-50 text-brand-600 font-medium" : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                )}>
                  <i className={cn("ti", item.icon, "text-base")} />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </aside>
  );
}
