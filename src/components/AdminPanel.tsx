"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Admin.module.css";
type Photo = {
  id: string;
  categoryId: string;
  alt: string;
  width: number;
  height: number;
  order: number;
  featured: boolean;
};
type Category = {
  id: string;
  name: string;
  order: number;
  coverPhotoId: string | null;
};
type Album = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  eventDate: string;
  visibility: "PUBLIC" | "SECRET" | "PASSWORD";
  theme: "AUTO" | "LIGHT" | "DARK";
  coverPhotoId: string | null;
  categories: Category[];
  photos: Photo[];
  _count: { visits: number; downloads: number };
};
export function AdminPanel() {
  const router = useRouter();
  const [albums, setAlbums] = useState<Album[]>([]),
    [active, setActive] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [uploadProgress, setUploadProgress] = useState({
      done: 0,
      total: 0,
      percent: 0,
    }),
    [links, setLinks] = useState<Record<string, string>>({});
  const album = albums.find((a) => a.id === active);
  async function load() {
    const r = await fetch("/api/admin");
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    setAlbums(d);
    setActive((v) => v || d[0]?.id || "");
  }
  useEffect(() => {
    void load().catch((e) => setMessage(e.message));
  }, []);
  async function mutate(action: string, data: unknown) {
    setBusy(true);
    try {
      const r = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, data }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (d.secret) {
        const a = albums.find((a) => a.id === d.id);
        const slug = a?.slug || (data as { slug: string }).slug;
        setLinks((v) => ({
          ...v,
          [d.id]: `${location.origin}/a/${slug}?k=${d.secret}`,
        }));
      }
      await load();
      if (action === "album") setActive(d.id);
      setMessage("Alterações guardadas.");
      return d;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Não foi possível guardar.");
    } finally {
      setBusy(false);
    }
  }
  async function upload(files: FileList | File[], categoryId: string) {
    if (!categoryId) {
      setMessage("Crie ou escolha uma categoria.");
      return;
    }
    setBusy(true);
    const list = Array.from(files);
    let failed = 0;
    for (const [i, file] of list.entries()) {
      setUploadProgress({ done: i, total: list.length, percent: 0 });
      const form = new FormData();
      form.append("file", file);
      form.append("categoryId", categoryId);
      try {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/admin/upload");
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable)
              setUploadProgress({
                done: i,
                total: list.length,
                percent: Math.round((e.loaded / e.total) * 100),
              });
          };
          xhr.onload = () => {
            let d;
            try {
              d = JSON.parse(xhr.responseText);
            } catch {
              reject(new Error("Resposta inválida ao carregar a fotografia."));
              return;
            }
            if (xhr.status >= 200 && xhr.status < 300) resolve();
            else reject(new Error(`${file.name}: ${d.error}`));
          };
          xhr.onerror = () => reject(new Error("Ligação interrompida."));
          xhr.send(form);
        });
      } catch (e) {
        failed++;
        setMessage(e instanceof Error ? e.message : "Falha no upload.");
      }
    }
    setUploadProgress({ done: list.length, total: list.length, percent: 100 });
    await load();
    setBusy(false);
    setMessage(
      failed
        ? `${list.length - failed} fotografias carregadas; ${failed} falharam. Pode tentar novamente.`
        : "Fotografias carregadas.",
    );
  }
  return (
    <main className={`shell ${styles.admin}`}>
      <div className={styles.bar}>
        <div>
          <p className="eyebrow">Memory Album</p>
          <h1>Administração</h1>
        </div>
        <button
          className="btn"
          onClick={async () => {
            await fetch("/api/auth", { method: "DELETE" });
            router.refresh();
          }}
        >
          Terminar sessão
        </button>
      </div>
      <p role="status" className={styles.message}>
        {message}
      </p>
      <label>
        Álbum
        <select value={active} onChange={(e) => setActive(e.target.value)}>
          <option value="">Criar novo álbum</option>
          {albums.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title}
            </option>
          ))}
        </select>
      </label>
      <button className="link" onClick={() => setActive("")}>
        + Novo álbum
      </button>
      <section className={styles.panel}>
        <h2>{album ? "Editar álbum" : "Criar álbum"}</h2>
        <AlbumForm
          key={album?.id || "new"}
          album={album}
          busy={busy}
          onSave={(data) => mutate("album", data)}
        />
      </section>
      {album && (
        <>
          <section className={styles.panel}>
            <h2>Partilha e estatísticas</h2>
            <p>
              {album.photos.length} fotografias · {album._count.visits} visitas
              · {album._count.downloads} downloads
            </p>
            {album.visibility === "SECRET" && !links[album.id] ? (
              <p>
                O segredo não é guardado em texto simples. Gere um novo link
                para o copiar; o anterior deixará de funcionar.
              </p>
            ) : (
              <>
                <label>
                  Link do álbum
                  <input
                    readOnly
                    value={
                      links[album.id] ||
                      `${typeof window === "undefined" ? "" : location.origin}/a/${album.slug}`
                    }
                  />
                </label>
                <div className={styles.actions}>
                  <button
                    className="btn"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          links[album.id] ||
                            `${location.origin}/a/${album.slug}`,
                        );
                        setMessage("Link copiado.");
                      } catch {
                        setMessage("Copie o link apresentado no campo.");
                      }
                    }}
                  >
                    Copiar link
                  </button>
                  <a
                    className="btn"
                    href={`/api/admin/qr?url=${encodeURIComponent(links[album.id] || `${typeof window === "undefined" ? "" : location.origin}/a/${album.slug}`)}`}
                    download
                  >
                    Baixar QR code
                  </a>
                  <a
                    className="btn"
                    href={links[album.id] || `/a/${album.slug}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir álbum
                  </a>
                </div>
              </>
            )}
            {album.visibility === "SECRET" && (
              <button
                className="btn"
                disabled={busy}
                onClick={() => {
                  if (confirm("Gerar um novo link e invalidar o anterior?"))
                    void mutate("rotate-secret", { id: album.id });
                }}
              >
                Gerar novo link secreto
              </button>
            )}
          </section>
          <section className={styles.panel}>
            <h2>Categorias</h2>
            {album.categories.map((c) => (
              <CategoryForm
                key={`${c.id}-${c.order}-${c.name}`}
                category={c}
                album={album}
                busy={busy}
                onSave={(data) => mutate("category", data)}
                onDelete={() => {
                  if (confirm("Remover esta categoria vazia?"))
                    void mutate("delete-category", { id: c.id });
                }}
              />
            ))}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = e.currentTarget;
                const data = new FormData(f);
                void mutate("category", {
                  albumId: album.id,
                  name: data.get("name"),
                  order: album.categories.length,
                }).then(() => f.reset());
              }}
            >
              <label>
                Nova categoria
                <input name="name" required maxLength={200} />
              </label>
              <button className="btn" disabled={busy}>
                Criar categoria
              </button>
            </form>
          </section>
          <section className={styles.panel}>
            <h2>Carregar fotografias</h2>
            <UploadBox
              categories={album.categories}
              busy={busy}
              onUpload={upload}
            />
            {uploadProgress.total > 0 && (
              <p role="status">
                {uploadProgress.done} / {uploadProgress.total} ficheiros ·
                ficheiro atual {uploadProgress.percent}%
                <progress max={100} value={uploadProgress.percent} />
              </p>
            )}
          </section>
          <section className={styles.panel}>
            <h2>Fotografias</h2>
            <p className="muted">
              Edite a legenda descritiva, categoria, ordem e destaque. Use a
              ordem numérica para organizar a galeria.
            </p>
            <div className={styles.photos}>
              {album.photos.map((p) => (
                <PhotoForm
                  key={`${p.id}-${p.order}-${p.categoryId}-${p.featured}`}
                  photo={p}
                  categories={album.categories}
                  busy={busy}
                  onSave={(data) => mutate("photo", data)}
                  onDelete={() => {
                    if (
                      confirm(
                        "Apagar definitivamente esta fotografia e os seus ficheiros?",
                      )
                    )
                      void mutate("delete-photo", { id: p.id });
                  }}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
function AlbumForm({
  album,
  busy,
  onSave,
}: {
  album?: Album;
  busy: boolean;
  onSave: (d: unknown) => Promise<unknown>;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const password = String(f.get("password") || "");
        void onSave({
          ...(album ? { id: album.id } : {}),
          title: f.get("title"),
          slug: f.get("slug"),
          subtitle: f.get("subtitle"),
          eventDate: f.get("eventDate"),
          visibility: f.get("visibility"),
          theme: f.get("theme"),
          ...(password ? { password } : {}),
          coverPhotoId: f.get("coverPhotoId") || null,
        });
      }}
    >
      <label>
        Título
        <input
          name="title"
          defaultValue={album?.title || "Graduação das Gêmeas 2026"}
          required
          maxLength={200}
        />
      </label>
      <label>
        Endereço do álbum
        <input
          name="slug"
          defaultValue={album?.slug || "graduacao-2026"}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          required
          maxLength={80}
        />
      </label>
      <label>
        Subtítulo
        <input
          name="subtitle"
          defaultValue={album?.subtitle || "Um dia para recordar."}
          maxLength={300}
        />
      </label>
      <label>
        Data do evento
        <input
          name="eventDate"
          type="date"
          defaultValue={album?.eventDate.slice(0, 10) || "2026-10-16"}
          required
        />
      </label>
      <label>
        Visibilidade
        <select name="visibility" defaultValue={album?.visibility || "SECRET"}>
          <option value="PUBLIC">Público</option>
          <option value="SECRET">Link secreto</option>
          <option value="PASSWORD">Protegido por palavra-passe</option>
        </select>
      </label>
      <label>
        Palavra-passe do álbum (mínimo 12 caracteres; vazio mantém a atual)
        <input
          name="password"
          type="password"
          minLength={12}
          maxLength={256}
          autoComplete="new-password"
        />
      </label>
      <label>
        Tema inicial
        <select name="theme" defaultValue={album?.theme || "AUTO"}>
          <option value="AUTO">Automático</option>
          <option value="LIGHT">Claro</option>
          <option value="DARK">Escuro</option>
        </select>
      </label>
      <label>
        Fotografia de capa
        <select name="coverPhotoId" defaultValue={album?.coverPhotoId || ""}>
          <option value="">Primeira fotografia</option>
          {album?.photos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.alt}
            </option>
          ))}
        </select>
      </label>
      <button disabled={busy} className="btn">
        Guardar álbum
      </button>
    </form>
  );
}
function CategoryForm({
  category,
  album,
  busy,
  onSave,
  onDelete,
}: {
  category: Category;
  album: Album;
  busy: boolean;
  onSave: (d: unknown) => Promise<unknown>;
  onDelete: () => void;
}) {
  return (
    <form
      className={styles.categoryRow}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        void onSave({
          id: category.id,
          albumId: album.id,
          name: f.get("name"),
          order: Number(f.get("order")),
          coverPhotoId: f.get("coverPhotoId") || null,
        });
      }}
    >
      <label>
        Nome
        <input
          name="name"
          defaultValue={category.name}
          required
          maxLength={200}
        />
      </label>
      <label>
        Ordem
        <input
          name="order"
          type="number"
          min={0}
          max={10000}
          defaultValue={category.order}
          required
        />
      </label>
      <label>
        Capa
        <select name="coverPhotoId" defaultValue={category.coverPhotoId || ""}>
          <option value="">Primeira fotografia</option>
          {album.photos
            .filter((p) => p.categoryId === category.id)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.alt}
              </option>
            ))}
        </select>
      </label>
      <div className={styles.actions}>
        <button className="btn" disabled={busy}>
          Guardar
        </button>
        <button
          className="link"
          type="button"
          disabled={busy}
          onClick={onDelete}
        >
          Remover
        </button>
      </div>
    </form>
  );
}
function UploadBox({
  categories,
  busy,
  onUpload,
}: {
  categories: Category[];
  busy: boolean;
  onUpload: (f: FileList | File[], c: string) => Promise<void>;
}) {
  const [category, setCategory] = useState(categories[0]?.id || "");
  const fileInput = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label>
        Categoria de destino
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Escolher categoria</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <div
        className={styles.drop}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!busy) void onUpload(e.dataTransfer.files, category);
        }}
      >
        <p>Arraste as fotografias para aqui</p>
        <button
          type="button"
          className="btn"
          disabled={busy || !category}
          onClick={() => fileInput.current?.click()}
        >
          Escolher fotografias
        </button>
        <input
          hidden
          ref={fileInput}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          disabled={busy || !category}
          onChange={(e) => {
            if (e.target.files) void onUpload(e.target.files, category);
            e.target.value = "";
          }}
        />
        <p className="muted">
          JPEG, PNG, WebP ou AVIF · tamanho definido no servidor · uma
          fotografia processada de cada vez.
        </p>
      </div>
    </div>
  );
}
function PhotoForm({
  photo,
  categories,
  busy,
  onSave,
  onDelete,
}: {
  photo: Photo;
  categories: Category[];
  busy: boolean;
  onSave: (d: unknown) => Promise<unknown>;
  onDelete: () => void;
}) {
  return (
    <form
      className={styles.photo}
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        void onSave({
          id: photo.id,
          alt: f.get("alt"),
          categoryId: f.get("categoryId"),
          order: Number(f.get("order")),
          featured: f.get("featured") === "on",
        });
      }}
    >
      <img
        src={`/api/photos/${photo.id}/media?size=320`}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        loading="lazy"
      />
      <label>
        Legenda / texto alternativo
        <input name="alt" defaultValue={photo.alt} maxLength={200} required />
      </label>
      <label>
        Categoria
        <select name="categoryId" defaultValue={photo.categoryId}>
          {categories.map((c) => (
            <option value={c.id} key={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Ordem
        <input
          name="order"
          type="number"
          min={0}
          max={100000}
          defaultValue={photo.order}
          required
        />
      </label>
      <label className={styles.checkbox}>
        <input
          name="featured"
          type="checkbox"
          defaultChecked={photo.featured}
        />{" "}
        Destaque
      </label>
      <div className={styles.actions}>
        <button className="btn" disabled={busy}>
          Guardar
        </button>
        <button
          className="link"
          type="button"
          disabled={busy}
          onClick={onDelete}
        >
          Apagar foto
        </button>
      </div>
    </form>
  );
}
