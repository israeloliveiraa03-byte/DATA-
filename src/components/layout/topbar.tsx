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
    <header className="h-12 flex items-center justify-between px-5 sticky top-0 z-50 flex-shrink-0 bg-white/90 backdrop-blur border-b border-slate-200">
      <Link href="/dashboard" className="flex-shrink-0">
        <DataLogo className="text-lg" />
      </Link>

      {/* Nav central */}
      <nav className="hidden md:flex items-center gap-1">
        {navItems.map(item => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors border ${
                active
                  ? "bg-brand-50 text-brand-700 border-brand-100"
                  : "text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="flex items-center gap-3">
        <span className="text-xs hidden sm:block font-medium text-slate-500">
          {user.email}
        </span>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-xs font-semibold px-3 py-1.5 rounded-md transition-colors text-slate-600 border border-slate-200 bg-white hover:bg-slate-50"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
