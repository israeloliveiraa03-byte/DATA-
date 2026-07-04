"use client";

import { useState } from "react";
import { toast } from "sonner";

const BRD = "1px solid #e8d8be";

interface AdminUser {
  id: string; name: string; email: string;
  plan: string; role: string; institution: string | null;
  createdAt: Date;
}

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
      <input value={query} onChange={e => setQuery(e.target.value)}
        placeholder="Buscar por nome ou e-mail..."
        className="w-full max-w-sm px-3 py-2 text-sm rounded-md mb-4 focus:outline-none"
        style={{ border: BRD, background: "#fff", color: "#111" }} />

      <div className="rounded-xl overflow-hidden" style={{ border: BRD, background: "#fff" }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: BRD }}>
              <th className="px-3 py-2 text-left font-bold" style={{ color: "#c48a42" }}>Nome</th>
              <th className="px-3 py-2 text-left font-bold" style={{ color: "#c48a42" }}>E-mail</th>
              <th className="px-3 py-2 text-left font-bold" style={{ color: "#c48a42" }}>Instituição</th>
              <th className="px-3 py-2 text-left font-bold" style={{ color: "#c48a42" }}>Plano</th>
              <th className="px-3 py-2 text-left font-bold" style={{ color: "#c48a42" }}>Papel</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} style={{ borderBottom: BRD }}>
                <td className="px-3 py-2 font-medium" style={{ color: "#5c3f13" }}>{u.name}</td>
                <td className="px-3 py-2" style={{ color: "#5c3f13" }}>{u.email}</td>
                <td className="px-3 py-2" style={{ color: "#a06d28" }}>{u.institution ?? "—"}</td>
                <td className="px-3 py-2">
                  <select value={u.plan} disabled={savingId === u.id}
                    onChange={e => updateUser(u.id, { plan: e.target.value })}
                    className="text-xs rounded px-1.5 py-1 focus:outline-none" style={{ border: BRD }}>
                    <option value="free">Gratuito</option>
                    <option value="pro">Pro</option>
                    <option value="institution">Instituição</option>
                  </select>
                </td>
                <td className="px-3 py-2">
                  <select value={u.role} disabled={savingId === u.id}
                    onChange={e => updateUser(u.id, { role: e.target.value })}
                    className="text-xs rounded px-1.5 py-1 focus:outline-none" style={{ border: BRD }}>
                    <option value="user">Usuário</option>
                    <option value="support">Suporte</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center" style={{ color: "#a06d28" }}>Nenhum usuário encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
