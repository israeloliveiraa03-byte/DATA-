import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { getResearchAccess, canEdit } from "@/lib/researches/access";
import { ResearchReadOnlyNotice } from "@/components/researches/readonly-notice";
import { FormBuilderClient } from "./form-builder-client";

export default async function FormBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const access = await getResearchAccess(id, session!.user!.id!);
  if (!access) notFound();

  if (!canEdit(access.role)) {
    return <ResearchReadOnlyNotice researchId={id} title={access.research.title} />;
  }

  return <FormBuilderClient research={access.research} />;
}
