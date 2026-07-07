import { buildNetworkMap } from "@/lib/network/build-network-map";
import { MapaGeralClient } from "./mapa-geral-client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mapa Geral — Dataº" };

export default async function MapaGeralPage() {
  const pins = await buildNetworkMap();
  return <MapaGeralClient pins={pins} />;
}
