import { ZodError } from "zod";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function fail(error: unknown) {
  if (error instanceof HttpError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError)
    return Response.json(
      { error: "Dados inválidos. Verifique os campos." },
      { status: 400 },
    );
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "P2002"
  )
    return Response.json(
      { error: "Já existe um álbum com este endereço." },
      { status: 409 },
    );
  console.error(error);
  return Response.json(
    { error: "Não foi possível concluir a operação." },
    { status: 500 },
  );
}
export function safeName(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100) || "fotografias"
  );
}
export function attachment(name: string) {
  return `attachment; filename="${safeName(name.split(".").slice(0, -1).join("."))}.${name.split(".").at(-1)}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}
