import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const centros = await prisma.centroSalud.findMany();
  console.log(JSON.stringify(centros, null, 2));
  await prisma.$disconnect();
}

run().catch(console.error);
