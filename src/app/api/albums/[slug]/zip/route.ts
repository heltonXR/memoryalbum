import { z } from "zod";
import { db } from "@/lib/db";
import { requireAlbum, rateLimit, sameOrigin } from "@/lib/security";
import { fail, HttpError } from "@/lib/errors";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    sameOrigin(req);
    await rateLimit(req, "zip-create", 4, 300);
    const { slug } = await params;
    const a = await db.album.findUnique({ where: { slug } });
    if (!a) throw new HttpError(404, "Álbum indisponível.");
    await requireAlbum(a.id);
    const { categoryId } = z
      .object({ categoryId: z.string().optional() })
      .parse(await req.json());
    if (
      categoryId &&
      !(await db.category.findFirst({
        where: { id: categoryId, albumId: a.id },
      }))
    )
      throw new HttpError(404, "Categoria indisponível.");
    const total = await db.photo.count({
      where: { albumId: a.id, ...(categoryId ? { categoryId } : {}) },
    });
    if (!total)
      throw new HttpError(400, "Não há fotografias para descarregar.");
    if (total > Number(process.env.ZIP_MAX_PHOTOS || 10000))
      throw new HttpError(
        413,
        "Escolha uma categoria para reduzir o tamanho do ZIP.",
      );
    const job = await db.zipJob.create({
      data: {
        albumId: a.id,
        categoryId,
        accessVersion: a.accessVersion,
        total,
      },
    });
    return Response.json({ id: job.id, total });
  } catch (e) {
    return fail(e);
  }
}
