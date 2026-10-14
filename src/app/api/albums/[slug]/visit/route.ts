import { db } from "@/lib/db";
import { requireAlbum, rateLimit, sameOrigin } from "@/lib/security";
import { fail, HttpError } from "@/lib/errors";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    sameOrigin(req);
    const { slug } = await params;
    await rateLimit(req, `visit:${slug}`, 20);
    const album = await db.album.findUnique({ where: { slug } });
    if (!album) throw new HttpError(404, "Álbum indisponível.");
    await requireAlbum(album.id);
    await db.visit.create({ data: { albumId: album.id } });
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
