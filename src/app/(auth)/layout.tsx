import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  return (
    <div className="min-h-dvh flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <a href="/" className="inline-block text-2xl font-medium tracking-tight text-gray-900">
            Data<span className="text-brand-500">º</span>
          </a>
          <p className="mt-2 text-sm text-gray-500">Plataforma de pesquisa de campo</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">{children}</div>
      </div>
    </div>
  );
}
