import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";

const BRD = "1px solid #e8d8be";
const TS  = { color: "#c48a42", fontSize: "9px" } as const;

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
    { href: "/admin/suporte",   label: "Suporte",      icon: "ti-headset",          adminOnly: false },
  ].filter(item => isAdmin || !item.adminOnly);

  return (
    <div className="min-h-full" style={{ background: "#fbf3e7" }}>
      <div className="max-w-5xl mx-auto px-6 py-6">
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={TS}>Área interna Dataº</p>
        <h1 className="text-xl font-bold mb-4" style={{ color: "#0f172a" }}>Administração</h1>

        <div className="flex gap-1.5 mb-6 rounded-lg p-1" style={{ border: BRD, background: "#fff", width: "fit-content" }}>
          {NAV.map(item => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold"
              style={{ color: "#5c3f13" }}>
              <i className={`ti ${item.icon}`} /> {item.label}
            </Link>
          ))}
        </div>

        {children}
      </div>
    </div>
  );
}
