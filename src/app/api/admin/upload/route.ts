import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { requireAdmin, rateLimit, sameOrigin } from "@/lib/security";
import { processImage } from "@/lib/images";
import { remove } from "@/lib/storage";
import { fail, HttpError } from "@/lib/errors";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    await requireAdmin();
    await rateLimit(req, "upload", 60);
    const length = Number(req.headers.get("content-length"));
    const max = Number(process.env.MAX_UPLOAD_MB || 25) * 1024 * 1024;
    if (!length || length > max + 65536)
      throw new HttpError(
        413,
        "Pedido demasiado grande ou sem tamanho conhecido.",
      );
    const form = await req.formData();
    const file = form.get("file");
    const categoryId = String(form.get("categoryId") || "");
    if (!(file instanceof File))
      throw new HttpError(400, "Escolha uma fotografia.");
    const category = await db.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) throw new HttpError(400, "Escolha uma categoria válida.");
    const image = await processImage(
      Buffer.from(await file.arrayBuffer()),
      category.albumId,
    );
    try {
      const photo = await db.photo.create({
        data: {
          id: randomUUID(),
          ...image,
          albumId: category.albumId,
          categoryId,
          alt: String(
            form.get("alt") || `Fotografia de ${category.name}`,
          ).slice(0, 200),
          order: await db.photo.count({ where: { categoryId } }),
        },
      });
      await db.category.updateMany({
        where: { id: categoryId, coverPhotoId: null },
        data: { coverPhotoId: photo.id },
      });
      await db.album.updateMany({
        where: { id: category.albumId, coverPhotoId: null },
        data: { coverPhotoId: photo.id },
      });
      return Response.json({ id: photo.id });
    } catch (e) {
      await Promise.allSettled(
        [
          image.originalKey,
          image.largeKey,
          ...Object.values(image.thumbnailKeys),
        ].map(remove),
      );
      throw e;
    }
  } catch (e) {
    return fail(e);
  }
}
