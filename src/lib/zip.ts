import archiver from "archiver";
import { once } from "node:events";
import { PassThrough } from "node:stream";
import { db } from "./db";
import { read, webStream } from "./storage";
import { safeName } from "./errors";
export function streamZip(
  job: { id: string; albumId: string; categoryId: string | null },
  signal: AbortSignal,
) {
  const output = new PassThrough({ highWaterMark: 64 * 1024 });
  const archive = archiver("zip", {
    store: true,
    forceZip64: true,
    highWaterMark: 64 * 1024,
  });
  let aborted = false;
  let active: import("node:stream").Readable | undefined;
  const stop = () => {
    aborted = true;
    active?.destroy();
    archive.abort();
    output.destroy();
  };
  signal.addEventListener("abort", stop, { once: true });
  archive.on("error", (e) => output.destroy(e));
  output.on("error", () => {});
  output.on("close", () => {
    if (!output.writableFinished) stop();
  });
  archive.pipe(output);
  // Produção sequencial: um original em leitura, sem carregar o álbum na memória.
  void (async () => {
    try {
      const categories = await db.category.findMany({
        where: { albumId: job.albumId },
        select: { id: true, name: true },
      });
      const names = new Map(
        categories.map((c) => [c.id, `${safeName(c.name)}-${c.id.slice(-6)}`]),
      );
      let cursor: string | undefined,
        completed = 0;
      while (!aborted) {
        const batch = await db.photo.findMany({
          where: {
            albumId: job.albumId,
            ...(job.categoryId ? { categoryId: job.categoryId } : {}),
          },
          orderBy: { id: "asc" },
          take: 50,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });
        if (!batch.length) break;
        for (const photo of batch) {
          if (aborted) break;
          active = await read(photo.originalKey);
          const done = once(archive, "entry");
          active.once("error", (e) => archive.emit("error", e));
          archive.append(active, {
            name: `${names.get(photo.categoryId)}/${photo.id}.${photo.extension}`,
          });
          await done;
          completed++;
          await db.zipJob.update({
            where: { id: job.id },
            data: { completed },
          });
        }
        cursor = batch.at(-1)!.id;
      }
      if (aborted) throw new Error("Download interrompido");
      await archive.finalize();
      await db.zipJob.update({
        where: { id: job.id },
        data: { status: "DONE" },
      });
      await db.downloadLog.create({
        data: { albumId: job.albumId, categoryId: job.categoryId, type: "ZIP" },
      });
    } catch (e) {
      archive.abort();
      output.destroy(e instanceof Error ? e : new Error("Erro ZIP"));
      await db.zipJob
        .update({
          where: { id: job.id },
          data: {
            status: aborted ? "CANCELLED" : "ERROR",
            error: aborted
              ? "Download interrompido."
              : "Não foi possível gerar o ZIP.",
          },
        })
        .catch(() => {});
    } finally {
      signal.removeEventListener("abort", stop);
    }
  })();
  return webStream(output);
}
