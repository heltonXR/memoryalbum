import { db } from "./db";
import { canView } from "./security";
export async function loadAlbum(slug: string, key?: string) {
  const album = await db.album.findUnique({
    where: { slug },
    include: {
      categories: { orderBy: { order: "asc" } },
      photos: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
    },
  });
  if (!album) return null;
  if (!(await canView(album, key))) return { locked: true as const, album };
  return { locked: false as const, album };
}
export function photoDTO(p: {
  id: string;
  categoryId: string;
  alt: string;
  width: number;
  height: number;
  featured: boolean;
}) {
  return {
    id: p.id,
    categoryId: p.categoryId,
    alt: p.alt,
    width: p.width,
    height: p.height,
    featured: p.featured,
    src: `/api/photos/${p.id}/media?size=640`,
    large: `/api/photos/${p.id}/media?size=large`,
    srcSet: [
      ...new Map(
        [320, 640, 960].map((w) => [Math.min(w, p.width), w]),
      ).entries(),
    ]
      .map(([actual, w]) => `/api/photos/${p.id}/media?size=${w} ${actual}w`)
      .join(", "),
  };
}
