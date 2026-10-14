import { PrismaClient } from '@prisma/client';
import { passwordHash } from './src/lib/security';

const prisma = new PrismaClient();

async function main() {
  const email = 'heltoncunha29@gmail.com';
  const senha = 'admin123'; 

  const hashDaSenha = await passwordHash(senha);

  await prisma.admin.upsert({
    where: { email: email.toLowerCase() },
    update: { passwordHash: hashDaSenha },
    create: {
      email: email.toLowerCase(),
      passwordHash: hashDaSenha,
    },
  });

  console.log('✅ Administrador criado/atualizado com sucesso!');
  console.log('📧 E-mail:', email);
  console.log('🔑 Senha:', senha);
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });