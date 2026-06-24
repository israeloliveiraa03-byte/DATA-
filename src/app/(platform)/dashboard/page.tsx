import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { researches } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await auth();
  const myResearches = await db.query.researches.findMany({
    where: eq(researches.ownerId, session!.user!.id!),
    orderBy: desc(researches.createdAt),
    limit: 6,
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            Olá, {session?.user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie suas pesquisas e visualize resultados.</p>
        </div>
        <Link href="/researches/new" className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors">
          <i className="ti ti-plus" />
          Nova pesquisa
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-2xl font-semibold text-gray-900">{myResearches.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total de pesquisas</p>
        </div>
        <div className="rounded-xl border border-teal-100 bg-teal-50 p-4">
          <p className="text-2xl font-semibold text-gray-900">{myResearches.filter(r => r.status === "active").length}</p>
          <p className="text-xs text-gray-500 mt-1">Ativas</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-2xl font-semibold text-gray-900">{myResearches.filter(r => r.status === "draft").length}</p>
          <p className="text-xs text-gray-500 mt-1">Rascunhos</p>
        </div>
        <div className="rounded-xl border border-brand-100 bg-brand-50 p-4">
          <p className="text-2xl font-semibold text-gray-900">{myResearches.filter(r => r.status === "published").length}</p>
          <p className="text-xs text-gray-500 mt-1">Publicadas</p>
        </div>
      </div>

      <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">Pesquisas recentes</h2>
      {myResearches.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl">
          <i className="ti ti-clipboard-list text-3xl text-gray-300 block mb-3" />
          <p className="text-sm text-gray-500 mb-4">Você ainda não tem pesquisas</p>
          <Link href="/researches/new" className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-500 text-white text-sm font-medium rounded-lg hover:bg-brand-600 transition-colors">
            <i className="ti ti-plus" /> Criar primeira pesquisa
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {myResearches.map((r) => (
            <Link key={r.id} href={`/researches/${r.id}`} className="block border border-gray-100 rounded-xl p-4 hover:border-brand-200 hover:bg-brand-50/30 transition-all">
              <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
              {r.cityName && <p className="text-xs text-gray-400 mt-0.5"><i className="ti ti-map-pin text-xs" /> {r.cityName}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
