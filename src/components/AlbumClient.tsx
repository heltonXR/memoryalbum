"use client";
import { useEffect, useRef, useState } from "react";
import type { AlbumView, PhotoView } from "@/lib/types";
import styles from "./Album.module.css";
export function AlbumClient({ album }: { album: AlbumView }) {
  const [category, setCategory] = useState<string | null>(null),
    [selected, setSelected] = useState<string | null>(null),
    [toast, setToast] = useState(""),
    [theme, setTheme] = useState(album.theme),
    [zip, setZip] = useState<{
      id: string;
      total: number;
      completed: number;
      status: string;
    } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    main = useRef<HTMLElement>(null),
    dialog = useRef<HTMLDivElement>(null),
    opener = useRef<HTMLElement | null>(null),
    touch = useRef<{ x: number; y: number } | null>(null);
  const photosForCategory = (id: string) =>
    album.photos.filter((p) => p.categoryId === id);
  const list =
    category && category !== "all" ? photosForCategory(category) : album.photos;
  const index = list.findIndex((p) => p.id === selected),
    photo = list[index];
  const cover =
    album.photos.find((p) => p.id === album.coverPhotoId) || album.photos[0];
  function notify(message: string) {
    setToast(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 2800);
  }
  useEffect(() => {
    void fetch(`/api/albums/${album.slug}/visit`, { method: "POST" });
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [album.id, album.slug]);
  useEffect(() => {
    if (
      !zip ||
      zip.status === "DONE" ||
      zip.status === "ERROR" ||
      zip.status === "CANCELLED"
    )
      return;
    const interval = setInterval(async () => {
      try {
        const r = await fetch(`/api/zip/${zip.id}?status=1`);
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setZip({ id: zip.id, ...d });
        if (d.status === "DONE")
          notify("ZIP preparado. Verifique os downloads do navegador.");
        if (d.error) notify(d.error);
      } catch (e) {
        notify(
          e instanceof Error
            ? e.message
            : "Não foi possível acompanhar o download.",
        );
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [zip?.id, zip?.status]);
  function step(direction: number) {
    if (list.length)
      setSelected(list[(index + direction + list.length) % list.length].id);
  }
  const stepRef = useRef(step);
  stepRef.current = step;
  useEffect(() => {
    if (!photo) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        stepRef.current(event.key === "ArrowLeft" ? -1 : 1);
      }
      if (event.key === "Tab") {
        const elements =
          dialog.current?.querySelectorAll<HTMLElement>("button,a[href]");
        if (!elements?.length) return;
        const first = elements[0],
          last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = before;
      document.removeEventListener("keydown", onKey);
      opener.current?.focus();
    };
  }, [!!photo]);
  useEffect(() => {
    if (!photo) return;
    for (const offset of [-1, 1]) {
      const next = list[(index + offset + list.length) % list.length];
      const image = new Image();
      image.src = next.large;
    }
  }, [selected, category]);
  useEffect(() => {
    const id = new URL(location.href).searchParams.get("photo");
    if (id && album.photos.some((p) => p.id === id)) {
      setCategory("all");
      setSelected(id);
    }
  }, [album.id]);
  async function share(p: PhotoView) {
    const url = new URL(location.href);
    url.searchParams.set("photo", p.id);
    try {
      if (navigator.share) {
        await navigator.share({
          title: album.title,
          text: p.alt,
          url: url.href,
        });
        return;
      }
      await navigator.clipboard.writeText(url.href);
      notify("Link copiado.");
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      notify(`Link: ${url.href}`);
    }
  }
  async function downloadZip() {
    try {
      notify("ZIP em preparação…");
      const r = await fetch(`/api/albums/${album.slug}/zip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          category && category !== "all" ? { categoryId: category } : {},
        ),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setZip({
        id: data.id,
        total: data.total,
        completed: 0,
        status: "PENDING",
      });
      const a = document.createElement("a");
      a.href = `/api/zip/${data.id}`;
      a.download = "";
      document.body.append(a);
      a.click();
      a.remove();
    } catch (e) {
      notify(
        e instanceof Error ? e.message : "Não foi possível preparar o ZIP.",
      );
    }
  }
  function openCategory(id: string) {
    setCategory(id);
    setTimeout(
      () =>
        main.current?.scrollIntoView({
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
        }),
      0,
    );
  }
  function thumb(p: PhotoView, extra?: string) {
    return (
      <img
        src={p.src}
        srcSet={p.srcSet}
        sizes="(min-width:1100px) 280px, (min-width:760px) 33vw, 50vw"
        width={p.width}
        height={p.height}
        alt={p.alt}
        loading="lazy"
        className={extra || ""}
        onLoad={(e) => e.currentTarget.classList.add(styles.loaded)}
        onError={(e) => e.currentTarget.classList.add(styles.loaded)}
      />
    );
  }
  const activeZip =
    !!zip && !["DONE", "ERROR", "CANCELLED"].includes(zip.status);
  return (
    <div
      data-theme={theme === "AUTO" ? undefined : theme.toLowerCase()}
      className={styles.album}
    >
      <a href="#categorias" className="skip">
        Saltar para as fotografias
      </a>
      <section className={styles.hero} aria-label="Capa do álbum">
        {cover && (
          <img
            src={cover.large}
            width={cover.width}
            height={cover.height}
            alt={cover.alt}
            fetchPriority="high"
            className={styles.cover}
          />
        )}
        <div className={styles.heroCopy}>
          <p className="eyebrow">
            Álbum digital ·{" "}
            {new Date(album.eventDate).toLocaleDateString("pt-PT", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "Africa/Maputo",
            })}
          </p>
          <h1>{album.title}</h1>
          <p className={styles.subtitle}>{album.subtitle}</p>
          <a href="#categorias" className="btn">
            Ver álbum
          </a>
        </div>
      </section>
      <main id="categorias" ref={main} className="shell">
        <div className={styles.toolbar}>
          <span className="eyebrow">
            Memórias de {new Date(album.eventDate).getFullYear()}
          </span>
          <label className={styles.theme}>
            Tema
            <select
              value={theme}
              onChange={(e) => {
                const v = e.target.value as typeof theme;
                setTheme(v);
              }}
            >
              <option value="AUTO">Automático</option>
              <option value="LIGHT">Claro</option>
              <option value="DARK">Escuro</option>
            </select>
          </label>
        </div>
        {category === null ? (
          <>
            <h2>Categorias</h2>
            <p className="muted">
              {album.photos.length} fotografias em {album.categories.length}{" "}
              categorias
            </p>
            <div className={styles.categories}>
              {[
                { id: "all", name: "Todas as fotos", coverPhotoId: cover?.id },
                ...album.categories,
              ].map((c) => {
                const photos =
                  c.id === "all" ? album.photos : photosForCategory(c.id);
                const image =
                  album.photos.find(
                    (p) =>
                      p.id === c.coverPhotoId &&
                      photos.some((x) => x.id === p.id),
                  ) || photos[0];
                return (
                  <button
                    key={c.id}
                    className={styles.category}
                    onClick={() => openCategory(c.id)}
                    aria-label={`${c.name}, ${photos.length} fotografias`}
                  >
                    {image && thumb(image)}
                    <span>
                      {c.name}
                      <small>{photos.length} fotografias</small>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className={styles.download}>
              <button
                className="btn"
                disabled={activeZip || !album.photos.length}
                onClick={downloadZip}
              >
                Baixar álbum completo (ZIP)
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.bar}>
              <button
                className="link"
                onClick={() => {
                  setCategory(null);
                  main.current?.scrollIntoView();
                }}
              >
                ← Categorias
              </button>
              <button
                className="btn"
                disabled={activeZip || !list.length}
                onClick={downloadZip}
              >
                Baixar todas
              </button>
            </div>
            <h2>
              {category === "all"
                ? "Todas as fotos"
                : album.categories.find((c) => c.id === category)?.name}
            </h2>
            <p className="muted">{list.length} fotografias</p>
            {list.length ? (
              <div className={styles.masonry}>
                {list.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={(e) => {
                      opener.current = e.currentTarget;
                      setSelected(p.id);
                    }}
                    style={{ aspectRatio: `${p.width}/${p.height}` }}
                    aria-label={`Ampliar ${p.featured ? "destaque: " : ""}${p.alt}, fotografia ${i + 1}`}
                  >
                    {thumb(p)}
                    {p.featured && (
                      <span className={styles.featured} aria-hidden="true">
                        ★ Destaque
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <p className={styles.empty}>
                Ainda não há fotografias nesta categoria.
              </p>
            )}
          </>
        )}
        {zip && (
          <div className={styles.progress} role="status">
            <label htmlFor="zip-progress">
              {zip.status === "DONE"
                ? "ZIP preparado"
                : zip.status === "ERROR" || zip.status === "CANCELLED"
                  ? "Download interrompido"
                  : "A preparar o ZIP"}{" "}
              — {zip.completed} / {zip.total} fotografias
            </label>
            <progress id="zip-progress" value={zip.completed} max={zip.total} />
          </div>
        )}
      </main>
      <footer>memoryalbum.com/a/{album.slug}</footer>
      {photo && (
        <div
          ref={dialog}
          className={styles.lightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Visualizador de fotografia"
        >
          <div className={styles.lightboxTop}>
            <button
              className="circle"
              aria-label="Fotografia anterior"
              onClick={() => step(-1)}
            >
              ←
            </button>
            <span aria-live="polite">
              {index + 1} / {list.length}
            </span>
            <button
              className="circle"
              aria-label="Fechar visualizador"
              onClick={() => setSelected(null)}
            >
              ×
            </button>
          </div>
          <div
            className={styles.stage}
            onTouchStart={(e) => {
              touch.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
              };
            }}
            onTouchEnd={(e) => {
              if (!touch.current) return;
              const dx = e.changedTouches[0].clientX - touch.current.x,
                dy = e.changedTouches[0].clientY - touch.current.y;
              if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy))
                step(dx < 0 ? 1 : -1);
              touch.current = null;
            }}
          >
            <img
              src={photo.large}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
            />
          </div>
          <p className={styles.caption}>{photo.alt}</p>
          <div className={styles.lightboxBottom}>
            <a
              className="btn"
              href={`/api/photos/${photo.id}/download`}
              download
              onClick={() => notify("Download iniciado.")}
            >
              Baixar foto
            </a>
            <button className="btn" onClick={() => share(photo)}>
              Partilhar
            </button>
            <button
              className="circle"
              aria-label="Fotografia seguinte"
              onClick={() => step(1)}
            >
              →
            </button>
          </div>
        </div>
      )}
      <div
        role="status"
        aria-live="polite"
        className={`${styles.toast} ${toast ? styles.toastOn : ""}`}
      >
        {toast}
      </div>
    </div>
  );
}
