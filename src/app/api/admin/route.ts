import { z } from "zod";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { requireAdmin, sameOrigin, hash, passwordHash } from "@/lib/security";
import { fail, HttpError } from "@/lib/errors";
import { remove } from "@/lib/storage";
const text = z.string().trim().min(1).max(200);
const albumSchema = z.object({
  id: z.string().optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(80),
  title: text,
  subtitle: z.string().max(300),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  visibility: z.enum(["PUBLIC", "SECRET", "PASSWORD"]),
  theme: z.enum(["AUTO", "LIGHT", "DARK"]),
  password: z.string().min(12).max(256).optional(),
  coverPhotoId: z.string().nullable().optional(),
});
export async function GET() {
  try {
    await requireAdmin();
    const albums = await db.album.findMany({
      include: {
        categories: { orderBy: { order: "asc" } },
        photos: { orderBy: { order: "asc" } },
        _count: { select: { visits: true, downloads: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return Response.json(
      albums.map(({ secretHash, passwordHash, ...a }) => ({
        ...a,
        photos: a.photos.map(
          ({ originalKey, largeKey, thumbnailKeys, exif, ...p }) => p,
        ),
      })),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return fail(e);
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    await requireAdmin();
    const body = await req.json();
    if (body.action === "album") {
      const d = albumSchema.parse(body.data);
      const previous = d.id
        ? await db.album.findUnique({ where: { id: d.id } })
        : null;
      if (d.id && !previous) throw new HttpError(404, "Álbum indisponível.");
      if (
        d.coverPhotoId &&
        !(await db.photo.findFirst({
          where: { id: d.coverPhotoId, albumId: d.id },
        }))
      )
        throw new HttpError(400, "Capa inválida.");
      if (d.visibility === "PASSWORD" && !d.password && !previous?.passwordHash)
        throw new HttpError(
          400,
          "Defina uma palavra-passe de pelo menos 12 caracteres.",
        );
      const eventDate = new Date(`${d.eventDate}T12:00:00Z`);
      if (
        !Number.isFinite(eventDate.getTime()) ||
        eventDate.toISOString().slice(0, 10) !== d.eventDate
      )
        throw new HttpError(400, "Data inválida.");
      const { id, password, ...fields } = d;
      let secret: string | undefined;
      if (
        d.visibility === "SECRET" &&
        (!previous?.secretHash || previous.visibility !== "SECRET")
      )
        secret = randomBytes(32).toString("base64url");
      const changed =
        !!previous &&
        (previous.visibility !== d.visibility || !!password || !!secret);
      const data = {
        ...fields,
        eventDate,
        ...(password ? { passwordHash: await passwordHash(password) } : {}),
        ...(secret ? { secretHash: hash(secret) } : {}),
        ...(changed ? { accessVersion: { increment: 1 } } : {}),
      };
      const album = id
        ? await db.album.update({ where: { id }, data })
        : await db.album.create({
            data: {
              ...fields,
              eventDate,
              passwordHash: password ? await passwordHash(password) : undefined,
              secretHash: secret ? hash(secret) : undefined,
            },
          });
      return Response.json({ id: album.id, secret });
    }
    if (body.action === "rotate-secret") {
      const { id } = z.object({ id: z.string() }).parse(body.data);
      const secret = randomBytes(32).toString("base64url");
      const album = await db.album.update({
        where: { id },
        data: {
          visibility: "SECRET",
          secretHash: hash(secret),
          accessVersion: { increment: 1 },
        },
      });
      return Response.json({ id: album.id, secret });
    }
    if (body.action === "category") {
      const d = z
        .object({
          id: z.string().optional(),
          albumId: z.string(),
          name: text,
          order: z.number().int().min(0).max(10000),
          coverPhotoId: z.string().nullable().optional(),
        })
        .parse(body.data);
      if (
        d.id &&
        !(await db.category.findFirst({
          where: { id: d.id, albumId: d.albumId },
        }))
      )
        throw new HttpError(404, "Categoria indisponível.");
      if (
        d.coverPhotoId &&
        !(await db.photo.findFirst({
          where: { id: d.coverPhotoId, categoryId: d.id, albumId: d.albumId },
        }))
      )
        throw new HttpError(400, "Capa inválida.");
      const { id, ...data } = d;
      return Response.json(
        id
          ? await db.category.update({ where: { id }, data })
          : await db.category.create({ data }),
      );
    }
    if (body.action === "delete-category") {
      const { id } = z.object({ id: z.string() }).parse(body.data);
      if (await db.photo.count({ where: { categoryId: id } }))
        throw new HttpError(
          409,
          "Mova ou apague as fotografias antes de remover a categoria.",
        );
      await db.category.delete({ where: { id } });
      return Response.json({ ok: true });
    }
    if (body.action === "photo") {
      const { id, ...data } = z
        .object({
          id: z.string(),
          categoryId: z.string(),
          alt: text,
          order: z.number().int().min(0).max(100000),
          featured: z.boolean(),
        })
        .parse(body.data);
      const photo = await db.photo.findUniqueOrThrow({ where: { id } });
      if (
        !(await db.category.findFirst({
          where: { id: data.categoryId, albumId: photo.albumId },
        }))
      )
        throw new HttpError(400, "Categoria inválida.");
      await db.$transaction(async (tx) => {
        await tx.photo.update({ where: { id }, data });
        if (photo.categoryId !== data.categoryId)
          await tx.category.updateMany({
            where: { coverPhotoId: id },
            data: { coverPhotoId: null },
          });
      });
      return Response.json({ ok: true });
    }
    if (body.action === "delete-photo") {
      const { id } = z.object({ id: z.string() }).parse(body.data);
      const photo = await db.photo.findUniqueOrThrow({ where: { id } });
      // Remover do armazenamento antes do registo permite repetir em caso de falha.
      await Promise.all(
        [
          photo.originalKey,
          photo.largeKey,
          ...Object.values(photo.thumbnailKeys as Record<string, string>),
        ].map(remove),
      );
      await db.$transaction([
        db.album.updateMany({
          where: { coverPhotoId: id },
          data: { coverPhotoId: null },
        }),
        db.category.updateMany({
          where: { coverPhotoId: id },
          data: { coverPhotoId: null },
        }),
        db.photo.delete({ where: { id } }),
      ]);
      return Response.json({ ok: true });
    }
    throw new HttpError(400, "Operação inválida.");
  } catch (e) {
    return fail(e);
  }
}
