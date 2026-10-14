import {
  createHash,
  createHmac,
  randomBytes,
  scrypt as derive,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import type { Album } from "@prisma/client";
import { db } from "./db";
import { HttpError } from "./errors";
const scrypt = promisify(derive);
export const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function passwordHash(value: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(value, salt, 64)) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}
export async function passwordMatches(value: string, stored: string) {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const actual = (await scrypt(value, salt, 64)) as Buffer;
  const expected = Buffer.from(key, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32 || s.includes("SUBSTITUIR"))
    throw new Error(
      "Configure SESSION_SECRET com pelo menos 32 caracteres aleatórios.",
    );
  return s;
}
function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}
export function grantToken(album: Album) {
  const payload = Buffer.from(
    JSON.stringify({
      id: album.id,
      v: album.accessVersion,
      exp: Date.now() + 7 * 86400000,
    }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}
function validGrant(token: string | undefined, album: Album) {
  try {
    if (!token) return false;
    const [p, s] = token.split(".");
    const expected = Buffer.from(sign(p));
    const given = Buffer.from(s || "");
    if (expected.length !== given.length || !timingSafeEqual(expected, given))
      return false;
    const x = JSON.parse(Buffer.from(p, "base64url").toString());
    return (
      x.id === album.id && x.v === album.accessVersion && x.exp > Date.now()
    );
  } catch {
    return false;
  }
}
export async function isAdmin() {
  const jar = await cookies();
  const token = jar.get("ma_session")?.value;
  if (!token) return false;
  const session = await db.session.findUnique({ where: { id: hash(token) } });
  return !!session && session.expiresAt > new Date();
}
export async function requireAdmin() {
  if (!(await isAdmin()))
    throw new HttpError(401, "Inicie sessão para continuar.");
}
export async function canView(album: Album, key?: string | null) {
  if (album.visibility === "PUBLIC" || (await isAdmin())) return true;
  if (album.visibility === "SECRET" && key && hash(key) === album.secretHash)
    return true;
  return validGrant(
    (await cookies()).get(`ma_album_${album.id}`)?.value,
    album,
  );
}
export async function requireAlbum(id: string) {
  const a = await db.album.findUnique({ where: { id } });
  if (!a || !(await canView(a)))
    throw new HttpError(404, "Álbum indisponível.");
  return a;
}
export async function setGrant(album: Album) {
  (await cookies()).set(`ma_album_${album.id}`, grantToken(album), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 86400,
    path: "/",
  });
}
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin || origin !== new URL(process.env.APP_URL || req.url).origin)
    throw new HttpError(403, "Pedido não autorizado.");
}
export async function rateLimit(
  req: Request,
  scope: string,
  limit: number,
  seconds = 60,
) {
  const ip =
    process.env.TRUST_PROXY === "1"
      ? req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown"
      : "local";
  const window = Math.floor(Date.now() / (seconds * 1000));
  const key = hash(`${scope}:${ip}:${window}`);
  const row = await db.rateBucket.upsert({
    where: { key },
    create: { key, expiresAt: new Date((window + 1) * seconds * 1000) },
    update: { hits: { increment: 1 } },
  });
  if (row.hits > limit)
    throw new HttpError(
      429,
      "Demasiados pedidos. Tente novamente dentro de alguns minutos.",
    );
}
export async function login(email: string, password: string) {
  const user = await db.admin.findUnique({
    where: { email: email.toLowerCase() },
  });
  // Execute sempre uma derivação, mesmo quando a conta não existe.
  const dummy = "00000000000000000000000000000000:" + "00".repeat(64);
  if (!(await passwordMatches(password, user?.passwordHash ?? dummy)) || !user)
    throw new HttpError(401, "E-mail ou palavra-passe incorretos.");
  const token = randomBytes(32).toString("base64url");
  await db.session.create({
    data: {
      id: hash(token),
      adminId: user.id,
      expiresAt: new Date(Date.now() + 8 * 3600000),
    },
  });
  (await cookies()).set("ma_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 8 * 3600,
    path: "/",
  });
}
export async function logout() {
  const jar = await cookies();
  const token = jar.get("ma_session")?.value;
  if (token) await db.session.deleteMany({ where: { id: hash(token) } });
  jar.delete("ma_session");
}
