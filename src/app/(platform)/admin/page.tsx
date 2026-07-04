import { db } from "@/lib/db";
import { users, researches, entities, territorioApplications, supportTickets } from "@/lib/db/schema";
import { count, eq, isNull, and, ne } from "drizzle-orm";

const BRD = "1px solid #e8d8be";

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

  const CARDS = [
    { label: "Usuários",              value: c.totalUsers,        icon: "ti-users",         color: "#c48a42" },
    { label: "Pesquisas ativas",      value: c.activeResearches,  icon: "ti-clipboard-list",color: "#4c6b3c" },
    { label: "Entidades",             value: c.totalEntities,     icon: "ti-map-pin",       color: "#1a56db" },
    { label: "Território pendente",   value: c.pendingTerritorio, icon: "ti-hourglass",     color: "#ba7517" },
    { label: "Chamados em aberto",    value: c.openTickets,       icon: "ti-headset",       color: "#c0392b" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {CARDS.map(card => (
        <div key={card.label} className="rounded-xl p-4" style={{ border: BRD, background: "#fff" }}>
          <div className="flex items-center gap-2 mb-2">
            <i className={`ti ${card.icon} text-lg`} style={{ color: card.color }} />
            <span className="text-xs font-semibold" style={{ color: "#5c3f13" }}>{card.label}</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: "#0f172a" }}>{card.value}</p>
        </div>
      ))}
    </div>
  );
}
