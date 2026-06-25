"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { User } from "next-auth";

const navItems = [
  { href: "/dashboard",  label: "Início" },
  { href: "/researches", label: "Pesquisas" },
  { href: "/profile",    label: "Perfil" },
];

export function PlatformTopbar({ user }: { user: User }) {
  const pathname = usePathname();

  return (
    <header
      className="h-12 flex items-center justify-between px-5 sticky top-0 z-50 flex-shrink-0"
      style={{ background: "#faf6ef", borderBottom: "1px solid #e8d9c0" }}
    >
      {/* Logo */}
      <Link href="/dashboard" className="text-lg font-bold tracking-tight flex-shrink-0"
        style={{ color: "#0a1628", fontFamily: "Georgia, serif" }}>
        Data<span style={{ color: "#b07d20" }}>º</span>
      </Link>

      {/* Nav central */}
      <nav className="hidden md:flex items-center gap-1">
        {navItems.map(item => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 rounded text-sm font-medium transition-colors"
              style={{
                background:  active ? "#fff8ec" : "transparent",
                color:       active ? "#7a3d00" : "#5c4a2a",
                border:      active ? "1px solid #d4b880" : "1px solid transparent",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="flex items-center gap-3">
        <span className="text-xs hidden sm:block font-medium" style={{ color: "#8b7355" }}>
          {user.email}
        </span>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-xs font-semibold px-3 py-1.5 rounded transition-colors"
          style={{ color: "#7a3d00", border: "1px solid #d4b880", background: "#fff" }}
        >
          Sair
        </button>
      </div>
    </header>
  );
}
