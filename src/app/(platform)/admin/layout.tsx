import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { AdminNav } from "./admin-nav";

// Gate de acesso: quem não é admin/suporte nem sabe que essa área existe —
// notFound() em vez de redirect, não revela a rota pra quem não deveria vê-la.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "admin" && role !== "support") notFound();

  const isAdmin = role === "admin";
  const NAV = [
    { href: "/admin",           label: "Visão geral", icon: "ti-layout-dashboard", adminOnly: true },
    { href: "/admin/usuarios",  label: "Usuários",    icon: "ti-users",            adminOnly: true },
    { href: "/admin/territorio",label: "Território",  icon: "ti-map",              adminOnly: true },
    { href: "/admin/suporte",   label: "Suporte",     icon: "ti-headset",          adminOnly: false },
  ].filter(item => isAdmin || !item.adminOnly).map(({ href, label, icon }) => ({ href, label, icon }));

  return (
    <div className="min-h-full bg-ink-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <p className="text-xs font-bold uppercase tracking-widest font-condensed text-brand-400 mb-1">Área interna Dataº</p>
        <h1 className="text-xl font-bold font-condensed text-ink-100 mb-4">Administração</h1>

        <AdminNav items={NAV} />

        {children}
      </div>
    </div>
  );
}
