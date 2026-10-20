"use client";
import { useCallback, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { User } from "next-auth";
import { PlatformSidebar, MobileNav } from "@/components/layout/sidebar";
import { PlatformTopbar } from "@/components/layout/topbar";
import { isFocusRoute } from "@/components/layout/nav-config";

// Moldura da plataforma: barra lateral (desktop), gaveta (celular) e topo.
// Editores de tela cheia (instrumento e painel) abrem em "modo foco", sem
// essa moldura — eles têm o próprio cabeçalho com salvar/visualizar.
export function AppShell({ user, children }: { user: User & { role?: string }; children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  if (isFocusRoute(pathname)) {
    return <div className="min-h-dvh bg-ink-950">{children}</div>;
  }

  return (
    <div className="min-h-dvh flex bg-ink-950">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] focus:rounded-md focus:bg-ink-900 focus:px-3 focus:py-2 focus:text-sm focus:shadow-md">
        Pular para o conteúdo
      </a>
      <PlatformSidebar role={user.role} />
      <MobileNav open={menuOpen} onClose={closeMenu} role={user.role} />
      <div className="flex-1 min-w-0 flex flex-col">
        <PlatformTopbar user={user} onOpenMenu={() => setMenuOpen(true)} />
        <main id="conteudo" className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
