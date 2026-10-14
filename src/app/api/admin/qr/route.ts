import QRCode from "qrcode";
import { requireAdmin } from "@/lib/security";
import { fail, HttpError, attachment } from "@/lib/errors";
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url).searchParams.get("url");
    if (
      !url ||
      new URL(url).origin !== new URL(process.env.APP_URL || req.url).origin
    )
      throw new HttpError(400, "Link inválido.");
    const png = await QRCode.toBuffer(url, {
      width: 768,
      margin: 3,
      errorCorrectionLevel: "M",
    });
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": attachment("album-qr.png"),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return fail(e);
  }
}
