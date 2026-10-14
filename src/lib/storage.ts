import { createReadStream } from "node:fs";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { put as blobPut, del as blobDel } from "@vercel/blob";

const driver = process.env.STORAGE_DRIVER || "local";
const base = path.resolve(
  /* turbopackIgnore: true */ process.env.LOCAL_STORAGE_PATH || "data/media",
);

const client = new S3Client({
  region: process.env.S3_REGION || "auto",
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: true,
  credentials: process.env.S3_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
      }
    : undefined,
});

function local(key: string) {
  const p = path.resolve(/* turbopackIgnore: true */ base, key);
  if (!p.startsWith(base + path.sep)) throw new Error("Chave inválida");
  return p;
}

export async function put(key: string, body: Buffer, type: string) {
  if (driver === "s3") {
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: type,
      }),
    );
  } else if (driver === "blob") {
    // Vercel Blob: usa o pacote oficial
    await blobPut(key, body, {
      access: "public",
      contentType: type,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
  } else {
    const p = local(key);
    await mkdir(path.dirname(p), { recursive: true });
    await writeFile(p, body);
  }
}

export async function remove(key: string) {
  if (driver === "s3")
    await client.send(
      new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
    );
  else if (driver === "blob") {
    try {
      await blobDel(key);
    } catch (e) {
      // Ignora se o blob não existir
    }
  } else
    await unlink(local(key)).catch((e) => {
      if (e.code !== "ENOENT") throw e;
    });
}

export async function read(key: string): Promise<Readable> {
  if (driver === "s3") {
    const result = await client.send(
      new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
    );
    return result.Body as Readable;
  } else if (driver === "blob") {
    // Constrói a URL pública do Blob e faz fetch
    const url = `https://${process.env.BLOB_STORE_ID}.public.blob.vercel-storage.com/${key}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Blob não encontrado: ${key}`);
    return Readable.fromWeb(res.body as any);
  }
  return createReadStream(local(key));
}

export async function signedOriginal(key: string, disposition: string) {
  if (driver !== "s3") return null;
  return getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      ResponseContentDisposition: disposition,
    }),
    { expiresIn: 60 },
  );
}

export const webStream = (stream: Readable) =>
  Readable.toWeb(stream) as ReadableStream<Uint8Array>;