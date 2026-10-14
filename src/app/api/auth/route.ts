import { z } from "zod";
import { login, logout, rateLimit, sameOrigin } from "@/lib/security";
import { fail } from "@/lib/errors";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    await rateLimit(req, "login", 5, 300);
    const data = z
      .object({ email: z.email(), password: z.string().min(1).max(256) })
      .parse(await req.json());
    await login(data.email, data.password);
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
export async function DELETE(req: Request) {
  try {
    sameOrigin(req);
    await logout();
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
