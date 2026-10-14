import { db } from "@/lib/db";
import { requireAlbum, rateLimit } from "@/lib/security";
import { streamZip } from "@/lib/zip";
import { attachment, fail, HttpError, safeName } from "@/lib/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const job = await db.zipJob.findUnique({ where: { id } });
    if (!job) throw new HttpError(404, "Download indisponível.");
    const album = await requireAlbum(job.albumId);
    if (new URL(req.url).searchParams.has("status"))
      return Response.json(
        {
          status: job.status,
          total: job.total,
          completed: job.completed,
          error: job.error,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    await rateLimit(req, "zip-stream", 4, 300);
    if (
      job.accessVersion !== album.accessVersion ||
      Date.now() - job.createdAt.getTime() > 3600000
    )
      throw new HttpError(410, "Download expirado. Prepare um novo ZIP.");
    const claimed = await db.zipJob.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "RUNNING" },
    });
    if (!claimed.count)
      throw new HttpError(
        409,
        "Este download já foi iniciado. Prepare um novo ZIP.",
      );
    const category = job.categoryId
      ? await db.category.findUnique({ where: { id: job.categoryId } })
      : null;
    const name = category
      ? `${album.slug}-${safeName(category.name)}.zip`
      : `${album.slug}.zip`;
    return new Response(streamZip(job, req.signal), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": attachment(name),
        "Cache-Control": "private, no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e) {
    return fail(e);
  }
}
