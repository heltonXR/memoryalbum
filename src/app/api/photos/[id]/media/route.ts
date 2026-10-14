import { db } from "@/lib/db";
import { requireAlbum } from "@/lib/security";
import { read, webStream } from "@/lib/storage";
import { fail, HttpError } from "@/lib/errors";
export const runtime = "nodejs";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const p = await db.photo.findUnique({ where: { id } });
    if (!p) throw new HttpError(404, "Fotografia indisponível.");
    const album = await requireAlbum(p.albumId);
    const size = new URL(req.url).searchParams.get("size") || "640";
    const thumbs = p.thumbnailKeys as Record<string, string>;
    const key = size === "large" ? p.largeKey : thumbs[size];
    if (!key) throw new HttpError(400, "Tamanho inválido.");
    const stream = await read(key);
    req.signal.addEventListener("abort", () => stream.destroy(), {
      once: true,
    });
    return new Response(webStream(stream), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-cache, max-age=0, must-revalidate",
        Vary: "Cookie",
      },
    });
  } catch (e) {
    return fail(e);
  }
}
