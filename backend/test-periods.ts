import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const updated = await prisma.periodo.update({
    where: { id: 1 },
    data: { estado: 'Abierto' }
  });
  console.log("Updated period:", updated);
  await prisma.$disconnect();
}

run();

