// Estrutura de navegação da plataforma — fonte única para a barra lateral,
// a gaveta do celular e a trilha de navegação do topo.

export interface NavItem { href: string; icon: string; label: string; description?: string }
export interface NavGroup { label: string; items: NavItem[] }

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Pesquisa",
    items: [
      { href: "/dashboard",  icon: "ti-layout-grid",     label: "Visão geral" },
      { href: "/researches", icon: "ti-clipboard-data",  label: "Pesquisas" },
    ],
  },
  {
    label: "Conhecimento",
    items: [
      { href: "/entidades",      icon: "ti-database",   label: "Entidades" },
      { href: "/mapa-geral",     icon: "ti-map-2",      label: "Mapa geral" },
      { href: "/notas-tecnicas", icon: "ti-notebook",   label: "Notas técnicas" },
      { href: "/colaboracao",    icon: "ti-users-group", label: "Colaboração" },
    ],
  },
  {
    label: "Conta",
    items: [
      { href: "/profile",  icon: "ti-user-circle", label: "Perfil" },
      { href: "/settings", icon: "ti-adjustments-horizontal", label: "Preferências" },
      { href: "/suporte",  icon: "ti-lifebuoy",    label: "Suporte" },
    ],
  },
];

export const STAFF_GROUP: NavGroup = {
  label: "Equipe Dataº",
  items: [
    { href: "/admin",         icon: "ti-shield-lock", label: "Administração" },
    { href: "/design-system", icon: "ti-palette",     label: "Sistema visual" },
  ],
};

/** Rótulos legíveis para segmentos de URL — usados na trilha do topo. */
export const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Visão geral",
  researches: "Pesquisas",
  new: "Nova",
  nova: "Nova",
  entidades: "Entidades",
  "mapa-geral": "Mapa geral",
  "notas-tecnicas": "Notas técnicas",
  colaboracao: "Colaboração",
  profile: "Perfil",
  settings: "Configurações",
  suporte: "Suporte",
  admin: "Administração",
  usuarios: "Usuários",
  territorio: "Território",
  "design-system": "Sistema visual",
  responses: "Respostas",
  "dashboard-builder": "Painéis",
  "form-builder": "Instrumento",
  campo: "Campo",
  "parear-aparelho": "Parear aparelho",
};

/** Rotas que abrem em "modo foco" (sem barra lateral nem topo da plataforma). */
export function isFocusRoute(pathname: string): boolean {
  return /\/researches\/[^/]+\/form-builder(\/|$)/.test(pathname)
    || /\/researches\/[^/]+\/dashboard-builder\/[^/]+/.test(pathname);
}

export function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}
