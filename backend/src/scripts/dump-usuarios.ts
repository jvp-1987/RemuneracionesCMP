import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const usuarios = await prisma.usuario.findMany({
    include: { centro_salud: true }
  });
  console.log(JSON.stringify(usuarios, null, 2));
  await prisma.$disconnect();
}

run().catch(console.error);
