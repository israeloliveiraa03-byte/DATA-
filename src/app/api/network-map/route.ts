import { auth } from "@/lib/auth";
import { buildNetworkMap } from "@/lib/network/build-network-map";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiError("Não autorizado", 401);

  const pins = await buildNetworkMap();
  return apiSuccess(pins);
}
