import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PlatformTopbar } from "@/components/layout/topbar";
import { PlatformSidebar } from "@/components/layout/sidebar";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return (
    <div className="min-h-dvh flex flex-col bg-white">
      <PlatformTopbar user={session.user} />
      <div className="flex flex-1">
        <PlatformSidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
