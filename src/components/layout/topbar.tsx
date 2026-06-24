"use client";
import Link from "next/link";
import { signOut } from "next-auth/react";
import type { User } from "next-auth";

export function PlatformTopbar({ user }: { user: User }) {
  return (
    <header className="h-12 flex items-center justify-between px-5 border-b border-gray-100 bg-white sticky top-0 z-50">
      <Link href="/dashboard" className="text-lg font-medium tracking-tight text-gray-900">
        Data<span className="text-brand-500">º</span>
      </Link>
      <nav className="hidden md:flex items-center gap-1">
        {[{ href: "/dashboard", label: "Início" }, { href: "/researches", label: "Pesquisas" }, { href: "/profile", label: "Perfil" }].map(item => (
          <Link key={item.href} href={item.href} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-400 hidden sm:block">{user.email}</span>
        <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-xs text-gray-500 hover:text-gray-900 transition-colors">
          Sair
        </button>
      </div>
    </header>
  );
}
