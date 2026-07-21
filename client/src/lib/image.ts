// Gera uma URL de imagem temática (Pollinations — grátis, sem chave/login).
// Roda no navegador via <img src>, então não depende de nada no servidor.
export function themeImageUrl(prompt: string, w = 512, h = 512, seed = 1) {
  const styled = `${prompt}, vibrant, high detail, digital art, no text`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(styled)}?width=${w}&height=${h}&nologo=true&seed=${seed}`;
}

// Read an image File and return a downscaled data URL to keep board payloads light.
export async function fileToScaledDataURL(file: File, maxDim = 1000, quality = 0.85): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });

  // GIFs must stay as-is to keep animation
  if (file.type === 'image/gif') return dataUrl;

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  let { width, height } = img;
  if (width > maxDim || height > maxDim) {
    const r = Math.min(maxDim / width, maxDim / height);
    width = Math.round(width * r);
    height = Math.round(height * r);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, width, height);
  const hasAlpha = file.type === 'image/png' || file.type === 'image/webp';
  return canvas.toDataURL(hasAlpha ? 'image/png' : 'image/jpeg', quality);
}

export function imageDims(dataUrl: string, cap = 260): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const i = new Image();
    i.onload = () => {
      let w = i.width, h = i.height;
      if (w > cap || h > cap) { const r = Math.min(cap / w, cap / h); w = Math.round(w * r); h = Math.round(h * r); }
      resolve({ w: w || 200, h: h || 160 });
    };
    i.onerror = () => resolve({ w: 200, h: 160 });
    i.src = dataUrl;
  });
}
