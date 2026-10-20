// Redimensionamento de imagem no navegador, antes de guardar como data URL.

// Variante que preserva transparência (PNG/WebP com fundo vazado) — usada
// nos fundos de gráfico/mapa e na logo da identidade visual.
export function resizeImageKeepAlpha(file: File, maxSide: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const src = ev.target?.result as string;
      if (file.type === "image/svg+xml") { resolve(src); return; }
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const keepsAlpha = file.type === "image/png" || file.type === "image/webp" || file.type === "image/gif";
        resolve(keepsAlpha ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = src;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
