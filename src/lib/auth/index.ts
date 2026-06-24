import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";
import { users, accounts, sessions } from "@/lib/db/schema";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable:    users,
    accountsTable: accounts,
    sessionsTable: sessions,
  }),
  providers: [
    Google({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! }),
    {
      id: "orcid", name: "ORCID", type: "oauth",
      authorization: { url: "https://orcid.org/oauth/authorize", params: { scope: "/authenticate" } },
      token:    "https://orcid.org/oauth/token",
      userinfo: "https://orcid.org/oauth/userinfo",
      clientId:     process.env.ORCID_CLIENT_ID,
      clientSecret: process.env.ORCID_CLIENT_SECRET,
      profile(profile) {
        return { id: profile.sub, name: profile.name ?? profile.given_name, email: profile.email, image: null };
      },
    },
  ],
  session: { strategy: "database" },
  callbacks: {
    session({ session, user }) { session.user.id = user.id; return session; },
  },
  pages: { signIn: "/login", error: "/login" },
});
