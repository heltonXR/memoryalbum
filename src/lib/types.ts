export type PhotoView = {
  id: string;
  categoryId: string;
  alt: string;
  width: number;
  height: number;
  featured: boolean;
  src: string;
  large: string;
  srcSet: string;
};
export type AlbumView = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  eventDate: string;
  theme: "AUTO" | "LIGHT" | "DARK";
  coverPhotoId: string | null;
  categories: {
    id: string;
    name: string;
    order: number;
    coverPhotoId: string | null;
  }[];
  photos: PhotoView[];
};
