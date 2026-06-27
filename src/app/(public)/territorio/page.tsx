import type { Metadata } from "next";
import { TerritorioClient } from "./territorio-client";

export const metadata: Metadata = {
  title: "Dataº Território — Candidatura",
  description: "Candidate sua organização ao programa de acesso gratuito Dataº Território para comunidades tradicionais.",
};

export default function TerritorioPage() {
  return <TerritorioClient />;
}
