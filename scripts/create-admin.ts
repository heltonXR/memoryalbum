import { db } from "../src/lib/db";
import { passwordHash } from "../src/lib/security";
async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase(),
    password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12)
    throw new Error(
      "Defina ADMIN_EMAIL e ADMIN_PASSWORD (mínimo 12 caracteres).",
    );
  await db.admin.upsert({
    where: { email },
    create: { email, passwordHash: await passwordHash(password) },
    update: { passwordHash: await passwordHash(password) },
  });
  // Trocar a palavra-passe revoga todas as sessões existentes.
  const admin = await db.admin.findUniqueOrThrow({ where: { email } });
  await db.session.deleteMany({ where: { adminId: admin.id } });
  console.log("Administrador criado/atualizado.");
}
main().finally(() => db.$disconnect());
