"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem { href: string; label: string; icon: string }

// Abas da área interna com indicação de onde você está — o layout (server)
// monta a lista conforme o papel (admin/support) e este componente só cuida
// do estado ativo, que depende da URL no cliente.
export function AdminNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Seções da administração" className="flex gap-1.5 mb-6 rounded-lg p-1 border border-ink-700 bg-ink-900 w-fit max-w-full overflow-x-auto">
      {items.map(item => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold font-condensed whitespace-nowrap transition-colors duration-150 ${
              active ? "bg-brand-500 text-on-accent" : "text-ink-300 hover:bg-ink-800 hover:text-ink-100"
            }`}
          >
            <i className={`ti ${item.icon}`} aria-hidden="true" /> {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
