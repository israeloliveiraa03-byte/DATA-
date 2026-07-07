"use client";

import { useState } from "react";
import { toast } from "sonner";

interface AdminUser {
  id: string; name: string; email: string;
  plan: string; role: string; institution: string | null;
  createdAt: Date;
}

const SELECT_CLASS = "text-xs rounded px-1.5 py-1 border border-ink-700 bg-ink-950 text-ink-100 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-wait";

export function UsersAdminClient({ users }: { users: AdminUser[] }) {
  const [list, setList] = useState(users);
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const filtered = list.filter(u =>
    u.name.toLowerCase().includes(query.toLowerCase()) ||
    u.email.toLowerCase().includes(query.toLowerCase())
  );

  async function updateUser(id: string, patch: { plan?: string; role?: string }) {
    setSavingId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) { toast.error("Erro ao atualizar usuário."); return; }
      setList(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u));
      toast.success("Usuário atualizado.");
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <label htmlFor="busca-usuarios" className="sr-only">Buscar usuário por nome ou e-mail</label>
      <div className="relative w-full max-w-sm mb-4">
        <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-500" aria-hidden="true" />
        <input id="busca-usuarios" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-ink-700 bg-ink-900 text-ink-100 placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors duration-150" />
      </div>

      <div className="rounded-lg border border-ink-700 bg-ink-900 overflow-x-auto">
        <table className="w-full text-xs min-w-[560px]">
          <thead>
            <tr className="border-b border-ink-700">
              <th className="px-3 py-2 text-left font-bold font-condensed uppercase tracking-wide text-ink-300">Nome</th>
              <th className="px-3 py-2 text-left font-bold font-condensed uppercase tracking-wide text-ink-300">E-mail</th>
              <th className="px-3 py-2 text-left font-bold font-condensed uppercase tracking-wide text-ink-300">Instituição</th>
              <th className="px-3 py-2 text-left font-bold font-condensed uppercase tracking-wide text-ink-300">Plano</th>
              <th className="px-3 py-2 text-left font-bold font-condensed uppercase tracking-wide text-ink-300">Papel</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} className="border-b border-ink-700 last:border-b-0">
                <td className="px-3 py-2 font-medium text-ink-100">{u.name}</td>
                <td className="px-3 py-2 text-ink-300">{u.email}</td>
                <td className="px-3 py-2 text-ink-300">{u.institution ?? "—"}</td>
                <td className="px-3 py-2">
                  <label htmlFor={`plan-${u.id}`} className="sr-only">Plano de {u.name}</label>
                  <select id={`plan-${u.id}`} value={u.plan} disabled={savingId === u.id}
                    onChange={e => updateUser(u.id, { plan: e.target.value })}
                    className={SELECT_CLASS}>
                    <option value="free">Exploração</option>
                    <option value="pesquisador">Pesquisador</option>
                    <option value="laboratorio">Laboratório</option>
                    <option value="governo">Governo</option>
                    <option value="territorio">Território</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <label htmlFor={`role-${u.id}`} className="sr-only">Papel de {u.name}</label>
                  <select id={`role-${u.id}`} value={u.role} disabled={savingId === u.id}
                    onChange={e => updateUser(u.id, { role: e.target.value })}
                    className={SELECT_CLASS}>
                    <option value="user">Usuário</option>
                    <option value="support">Suporte</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-ink-300">
                  Nenhum usuário encontrado para “{query}”. Tente outro nome ou e-mail.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
