import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadAlbum, photoDTO } from "@/lib/album";
import { AlbumClient } from "@/components/AlbumClient";
import { Unlock } from "@/components/Unlock";
export const dynamic = "force-dynamic";
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ k?: string }>;
};
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadAlbum(slug);
  if (!result) return { title: "Álbum indisponível" };
  const a = result.album;
  if (a.visibility !== "PUBLIC")
    return {
      title: "Álbum privado — Memory Album",
      robots: { index: false, follow: false },
      description: "Um álbum privado para convidados e família.",
    };
  const photo = a.photos.find((p) => p.id === a.coverPhotoId) || a.photos[0];
  const image = photo ? `/api/photos/${photo.id}/media?size=large` : undefined;
  return {
    title: a.title,
    description: `${a.subtitle} ${a.title} · ${a.eventDate.toLocaleDateString("pt-PT", { timeZone: "Africa/Maputo" })}.`,
    alternates: { canonical: `/a/${a.slug}` },
    openGraph: {
      title: a.title,
      description: a.subtitle,
      type: "website",
      url: `/a/${a.slug}`,
      locale: "pt_PT",
      ...(image
        ? {
            images: [
              {
                url: image,
                width: photo!.width,
                height: photo!.height,
                alt: photo!.alt,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: a.title,
      description: a.subtitle,
      ...(image ? { images: [image] } : {}),
    },
  };
}
export default async function AlbumPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { k } = await searchParams;
  const result = await loadAlbum(slug);
  if (!result) notFound();
  const a = result.album;
  if (result.locked)
    return <Unlock slug={slug} secretKey={k} visibility={a.visibility} />;
  return (
    <AlbumClient
      key={a.id}
      album={{
        id: a.id,
        slug: a.slug,
        title: a.title,
        subtitle: a.subtitle,
        eventDate: a.eventDate.toISOString(),
        theme: a.theme,
        coverPhotoId: a.coverPhotoId,
        categories: a.categories.map((c) => ({
          id: c.id,
          name: c.name,
          order: c.order,
          coverPhotoId: c.coverPhotoId,
        })),
        photos: a.photos.map(photoDTO),
      }}
    />
  );
}
