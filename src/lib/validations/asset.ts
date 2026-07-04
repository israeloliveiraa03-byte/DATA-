import { z } from "zod";

export const createAssetSchema = z.object({
  name:     z.string().min(1, "Dê um nome pra sua figurinha/imagem").max(200),
  imageUrl: z.string().min(1).max(1000000), // redimensionada no cliente antes de enviar (ver resizeImageToDataUrl)
  isShared: z.boolean().default(false),
});

export const updateAssetSchema = z.object({
  name:     z.string().min(1).max(200).optional(),
  isShared: z.boolean().optional(),
});

export type CreateAssetInput = z.infer<typeof createAssetSchema>;
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;
