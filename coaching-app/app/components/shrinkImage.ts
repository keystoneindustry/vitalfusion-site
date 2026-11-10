/** Shrinks a phone photo to at most `maxSide` px on the long side as a JPEG (~200–400 KB). Browser only. */
export async function shrinkImage(file: File, maxSide = 1280): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("decode"));
      i.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    if (!blob) throw new Error("encode");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Shrinks, or falls back to the original when it's already a usable size and type. */
export async function preparePhoto(file: File): Promise<Blob | null> {
  try {
    return await shrinkImage(file);
  } catch {
    return file.size <= 4 * 1024 * 1024 && /^image\/(jpeg|png|webp)$/.test(file.type) ? file : null;
  }
}
