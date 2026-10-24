/** Compress a camera/file image to a JPEG data URL small enough for a server fn. */
export async function compressImage(file: File, maxEdge = 720, quality = 0.62): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Choose a photo");
  let edge = maxEdge;
  let q = quality;
  const bmp = await createImageBitmap(file);
  for (let i = 0; i < 5; i++) {
    const scale = Math.min(1, edge / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const h = Math.max(1, Math.round(bmp.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bmp.close();
      throw new Error("Could not read that photo");
    }
    ctx.drawImage(bmp, 0, 0, w, h);
    const url = canvas.toDataURL("image/jpeg", q);
    if (url.length <= 220_000 || i === 4) {
      bmp.close();
      return url;
    }
    edge = Math.round(edge * 0.75);
    q = Math.max(0.42, q - 0.08);
  }
  bmp.close();
  throw new Error("Photo is too large");
}

export function isDataImage(value: string) {
  return value.startsWith("data:image/");
}
