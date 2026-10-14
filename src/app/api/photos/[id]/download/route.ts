import { db } from "@/lib/db";
import { requireAlbum, rateLimit } from "@/lib/security";
import { read, webStream, signedOriginal } from "@/lib/storage";
import { attachment, fail, HttpError, safeName } from "@/lib/errors";
export const runtime = "nodejs";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await rateLimit(req, "photo-download", 60);
    const p = await db.photo.findUnique({ where: { id } });
    if (!p) throw new HttpError(404, "Fotografia indisponível.");
    const album = await requireAlbum(p.albumId);
    const disposition = attachment(
      `${safeName(album.slug)}-${p.id}.${p.extension}`,
    );
    const url = await signedOriginal(p.originalKey, disposition);
    await db.downloadLog.create({
      data: { albumId: p.albumId, photoId: p.id, type: "PHOTO" },
    });
    if (url) return Response.redirect(url, 302);
    const stream = await read(p.originalKey);
    req.signal.addEventListener("abort", () => stream.destroy(), {
      once: true,
    });
    return new Response(webStream(stream), {
      headers: {
        "Content-Type": p.mime,
        "Content-Disposition": disposition,
        "Content-Length": String(p.size),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return fail(e);
  }
}
