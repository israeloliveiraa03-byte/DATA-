import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { TerritorioClient } from "./territorio-client";

export const metadata: Metadata = {
  title: "Dataº Território — Candidatura",
  description: "Candidate sua organização ao programa de acesso gratuito Dataº Território para comunidades tradicionais.",
};

export default async function TerritorioPage() {
  const session = await auth();
  return <TerritorioClient loggedIn={!!session?.user} />;
}
