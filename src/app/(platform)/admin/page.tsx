import Link from "next/link";
import { db } from "@/lib/db";
import { users, researches, entities, territorioApplications, supportTickets } from "@/lib/db/schema";
import { count, eq, isNull, and, ne } from "drizzle-orm";

async function getCounts() {
  const [[{ value: totalUsers }], [{ value: activeResearches }], [{ value: totalEntities }], [{ value: pendingTerritorio }], [{ value: openTickets }]] = await Promise.all([
    db.select({ value: count() }).from(users).where(isNull(users.deletedAt)),
    db.select({ value: count() }).from(researches).where(and(isNull(researches.deletedAt), eq(researches.status, "active"))),
    db.select({ value: count() }).from(entities).where(isNull(entities.deletedAt)),
    db.select({ value: count() }).from(territorioApplications).where(eq(territorioApplications.status, "pending")),
    db.select({ value: count() }).from(supportTickets).where(ne(supportTickets.status, "closed")),
  ]);
  return { totalUsers, activeResearches, totalEntities, pendingTerritorio, openTickets };
}

export default async function AdminOverviewPage() {
  const c = await getCounts();

  // Cor de acento só no ícone/indicador — nunca no chrome. Cards com pendência
  // (Território, Suporte) linkam direto pra fila correspondente.
  const CARDS = [
    { label: "Usuários",            value: c.totalUsers,        icon: "ti-users",          color: "text-brand-400", href: "/admin/usuarios" },
    { label: "Pesquisas ativas",    value: c.activeResearches,  icon: "ti-clipboard-list", color: "text-teal-500",  href: null },
    { label: "Entidades",           value: c.totalEntities,     icon: "ti-map-pin",        color: "text-chart-1",   href: null },
    { label: "Território pendente", value: c.pendingTerritorio, icon: "ti-hourglass",      color: "text-amber-500", href: "/admin/territorio" },
    { label: "Chamados em aberto",  value: c.openTickets,       icon: "ti-headset",        color: "text-coral-500", href: "/admin/suporte" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {CARDS.map(card => {
        const body = (
          <>
            <div className="flex items-center gap-2 mb-2">
              <i className={`ti ${card.icon} text-lg ${card.color}`} aria-hidden="true" />
              <span className="text-xs font-semibold text-ink-300">{card.label}</span>
            </div>
            <div className="flex items-end justify-between">
              <p className="text-2xl font-bold font-condensed text-ink-100">{card.value}</p>
              {card.href && <i className="ti ti-arrow-right text-xs text-brand-400" aria-hidden="true" />}
            </div>
          </>
        );
        return card.href ? (
          <Link key={card.label} href={card.href}
            className="rounded-lg p-4 border border-ink-700 bg-ink-900 transition-colors duration-150 hover:border-brand-500/40">
            {body}
          </Link>
        ) : (
          <div key={card.label} className="rounded-lg p-4 border border-ink-700 bg-ink-900">
            {body}
          </div>
        );
      })}
    </div>
  );
}
