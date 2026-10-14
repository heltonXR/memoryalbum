import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { put, remove } from "./storage";
import { HttpError } from "./errors";
const formats: Record<string, { mime: string; ext: string }> = {
  jpeg: { mime: "image/jpeg", ext: "jpg" },
  png: { mime: "image/png", ext: "png" },
  webp: { mime: "image/webp", ext: "webp" },
  avif: { mime: "image/avif", ext: "avif" },
};
export async function processImage(buffer: Buffer, albumId: string) {
  const max = Number(process.env.MAX_UPLOAD_MB || 25) * 1024 * 1024;
  if (!buffer.length || buffer.length > max)
    throw new HttpError(413, "Fotografia demasiado grande.");
  let meta: sharp.Metadata;
  try {
    meta = await sharp(buffer, {
      limitInputPixels: 60000000,
      animated: false,
    }).metadata();
  } catch {
    throw new HttpError(400, "Ficheiro de imagem inválido.");
  }
  const format = formats[meta.format || ""];
  if (!format || !meta.width || !meta.height || (meta.pages || 1) > 1)
    throw new HttpError(
      400,
      "Use uma fotografia JPEG, PNG, WebP ou AVIF sem animação.",
    );
  const rotated = await sharp(buffer, { limitInputPixels: 60000000 })
    .rotate()
    .resize({
      width: 2048,
      height: 2048,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 86 })
    .toBuffer({ resolveWithObject: true });
  const prefix = `${albumId}/${randomUUID()}`;
  const keys: string[] = [];
  const originalKey = `${prefix}/original.${format.ext}`,
    largeKey = `${prefix}/large.webp`;
  try {
    await put(originalKey, buffer, format.mime);
    keys.push(originalKey);
    await put(largeKey, rotated.data, "image/webp");
    keys.push(largeKey);
    const thumbnailKeys: Record<string, string> = {};
    for (const width of [320, 640, 960]) {
      const key = `${prefix}/${width}.webp`;
      const b = await sharp(buffer, { limitInputPixels: 60000000 })
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 78 })
        .toBuffer();
      await put(key, b, "image/webp");
      keys.push(key);
      thumbnailKeys[String(width)] = key;
    }
    const sideways = [5, 6, 7, 8].includes(meta.orientation || 1);
    return {
      originalKey,
      largeKey,
      thumbnailKeys,
      width: sideways ? meta.height : meta.width,
      height: sideways ? meta.width : meta.height,
      size: buffer.length,
      mime: format.mime,
      extension: format.ext,
    };
  } catch (e) {
    await Promise.allSettled(keys.map(remove));
    throw e;
  }
}
