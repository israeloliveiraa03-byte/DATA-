"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { User } from "next-auth";
import { DataLogo } from "@/components/layout/data-logo";

const navItems = [
  { href: "/dashboard",  label: "Início" },
  { href: "/researches", label: "Pesquisas" },
  { href: "/profile",    label: "Perfil" },
];

export function PlatformTopbar({ user }: { user: User }) {
  const pathname = usePathname();

  return (
    <header className="h-12 flex items-center justify-between px-5 sticky top-0 z-50 flex-shrink-0 bg-ink-950/95 backdrop-blur border-b border-ink-700">
      <Link href="/dashboard" className="flex-shrink-0 text-ink-100">
        <DataLogo className="text-lg font-condensed" />
      </Link>

      {/* Nav central */}
      <nav className="hidden md:flex items-center gap-1">
        {navItems.map(item => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded text-sm font-medium font-condensed transition-colors duration-150 border ${
                active
                  ? "bg-brand-50/10 text-brand-400 border-brand-500/30"
                  : "text-ink-300 border-transparent hover:bg-ink-900 hover:text-ink-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="flex items-center gap-3">
        <span className="text-xs hidden sm:block font-medium text-ink-300">
          {user.email}
        </span>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-xs font-semibold px-3 py-1.5 rounded transition-colors duration-150 text-ink-300 border border-ink-700 bg-ink-900 hover:bg-ink-800 hover:text-ink-100"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
