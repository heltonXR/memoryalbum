import { db } from "../src/lib/db";
async function main() {
  const now = new Date();
  const older = new Date(Date.now() - 86400000);
  await db.session.deleteMany({ where: { expiresAt: { lt: now } } });
  await db.rateBucket.deleteMany({ where: { expiresAt: { lt: now } } });
  await db.zipJob.updateMany({
    where: {
      status: "RUNNING",
      createdAt: { lt: new Date(Date.now() - 3600000) },
    },
    data: {
      status: "ERROR",
      error: "Preparação interrompida. Prepare um novo ZIP.",
    },
  });
  await db.zipJob.deleteMany({ where: { createdAt: { lt: older } } });
  console.log("Manutenção concluída.");
}
main().finally(() => db.$disconnect());
