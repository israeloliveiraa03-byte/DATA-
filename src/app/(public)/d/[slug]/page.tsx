import type { Metadata } from "next";
import { db } from "@/lib/db";
import { dashboards } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PublicDashboardClient } from "./public-dashboard-client";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const dashboard = await db.query.dashboards.findFirst({ where: and(eq(dashboards.publicSlug, slug), eq(dashboards.isPublic, true)) });
  return { title: dashboard ? `${dashboard.title} — Dataº` : "Dashboard — Dataº" };
}

export default async function PublicDashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const dashboard = await db.query.dashboards.findFirst({
    where: and(eq(dashboards.publicSlug, slug), eq(dashboards.isPublic, true)),
  });
  if (!dashboard) notFound();

  return <PublicDashboardClient slug={slug} />;
}
