import type { DefaultSession } from "next-auth";

// Papel de equipe interna (admin/suporte) — ver src/lib/db/schema/users.ts
// e o callback session() em src/lib/auth/index.ts.
declare module "next-auth" {
  interface Session {
    user: {
      role: string;
    } & DefaultSession["user"];
  }
}
