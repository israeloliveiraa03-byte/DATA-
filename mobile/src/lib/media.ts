// Captura e armazenamento local de mídia (foto/arquivo) do preenchimento.
//
// Fluxo: capturar → gravar o arquivo no Filesystem do aparelho
// (Directory.Data/media/) → registrar em local_media (localDb) → gravar um
// placeholder { kind:"media", localMediaId, pending:true } no campo da
// resposta. O upload de verdade acontece depois, na fila de mídia do
// syncWorker, quando a resposta já subiu.
//
// Limite de 4MB por arquivo: espelha o teto do endpoint /api/media/upload
// (corpo de requisição em function da Vercel tem máximo ~4,5MB). Fotos são
// capturadas comprimidas (quality 70, largura máx. 1600px) e ficam bem
// abaixo disso na prática.

import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Directory, Filesystem } from "@capacitor/filesystem";

export const MAX_MEDIA_BYTES = 4 * 1024 * 1024;

export interface CapturedMedia {
  id:             string;
  filePath:       string; // relativo a Directory.Data
  fileName:       string;
  mimeType:       string;
  sizeBytes:      number;
  previewDataUrl: string | null; // pra miniatura imediata na tela (só imagem)
}

function base64Bytes(base64: string): number {
  // 4 chars base64 = 3 bytes (aproximação suficiente pra checagem de limite).
  return Math.floor(base64.length * 3 / 4);
}

async function writeLocalFile(base64: string, ext: string): Promise<{ id: string; filePath: string }> {
  const id = crypto.randomUUID();
  const filePath = `media/${id}.${ext}`;
  await Filesystem.writeFile({
    path:      filePath,
    data:      base64,
    directory: Directory.Data,
    recursive: true,
  });
  return { id, filePath };
}

/**
 * Abre a câmera OU a galeria (CameraSource.Prompt deixa a pessoa escolher),
 * comprime, grava local e devolve a referência. Devolve null se a pessoa
 * cancelar (o plugin lança erro no cancelamento — tratado aqui, não em cima).
 */
export async function capturePhoto(): Promise<CapturedMedia | null> {
  let base64: string | undefined;
  let format = "jpeg";
  try {
    const photo = await Camera.getPhoto({
      resultType:         CameraResultType.Base64,
      source:             CameraSource.Prompt,
      quality:            70,
      width:              1600,
      correctOrientation: true,
    });
    base64 = photo.base64String;
    format = photo.format || "jpeg";
  } catch {
    return null; // cancelamento ou permissão negada — quem chama mostra nada
  }
  if (!base64) return null;

  const sizeBytes = base64Bytes(base64);
  if (sizeBytes > MAX_MEDIA_BYTES) {
    throw new Error("A foto ficou acima de 4MB — tente novamente com menos resolução.");
  }

  const ext  = format === "png" ? "png" : format === "webp" ? "webp" : "jpg";
  const mime = format === "png" ? "image/png" : format === "webp" ? "image/webp" : "image/jpeg";
  const { id, filePath } = await writeLocalFile(base64, ext);

  return {
    id,
    filePath,
    fileName:       `foto-${id.slice(0, 8)}.${ext}`,
    mimeType:       mime,
    sizeBytes,
    previewDataUrl: `data:${mime};base64,${base64}`,
  };
}

/**
 * Importa um arquivo escolhido num <input type="file"> (o WebView do
 * Capacitor abre o seletor nativo do sistema — sem plugin extra). Grava
 * local igual à foto. Lança erro com mensagem amigável se passar do limite.
 */
export async function importPickedFile(file: File): Promise<CapturedMedia> {
  if (file.size > MAX_MEDIA_BYTES) {
    throw new Error("Arquivo acima do limite de 4MB.");
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const mime   = file.type || "application/octet-stream";
  const ext    = (file.name.includes(".") ? file.name.split(".").pop() : "bin") || "bin";
  const { id, filePath } = await writeLocalFile(base64, ext.toLowerCase());

  return {
    id,
    filePath,
    fileName:       file.name,
    mimeType:       mime,
    sizeBytes:      file.size,
    previewDataUrl: mime.startsWith("image/") ? dataUrl : null,
  };
}

/** Lê o arquivo local de volta como Blob, pronto pro FormData do upload. */
export async function readMediaBlob(filePath: string, mimeType: string): Promise<Blob> {
  const res = await Filesystem.readFile({ path: filePath, directory: Directory.Data });
  if (res.data instanceof Blob) return res.data; // implementação web devolve Blob
  const bin   = atob(res.data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

/** Apaga o arquivo local — melhor esforço (mídia substituída/recapturada). */
export async function deleteMediaFile(filePath: string): Promise<void> {
  try {
    await Filesystem.deleteFile({ path: filePath, directory: Directory.Data });
  } catch {
    // Arquivo já não existe ou FS indisponível — a fila é a fonte de verdade.
  }
}
