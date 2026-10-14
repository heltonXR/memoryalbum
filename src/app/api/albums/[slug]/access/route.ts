import { z } from "zod";
import { db } from "@/lib/db";
import {
  hash,
  passwordMatches,
  rateLimit,
  sameOrigin,
  setGrant,
} from "@/lib/security";
import { fail, HttpError } from "@/lib/errors";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    sameOrigin(req);
    const { slug } = await params;
    await rateLimit(req, `unlock:${slug}`, 5, 300);
    const { key, password } = z
      .object({
        key: z.string().max(256).optional(),
        password: z.string().max(256).optional(),
      })
      .parse(await req.json());
    const album = await db.album.findUnique({ where: { slug } });
    if (!album) throw new HttpError(404, "Álbum indisponível.");
    const ok =
      album.visibility === "PUBLIC" ||
      (album.visibility === "SECRET" &&
        key &&
        hash(key) === album.secretHash) ||
      (album.visibility === "PASSWORD" &&
        password &&
        album.passwordHash &&
        (await passwordMatches(password, album.passwordHash)));
    if (!ok)
      throw new HttpError(
        403,
        "Acesso não autorizado. Verifique o link ou a palavra-passe.",
      );
    await setGrant(album);
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
