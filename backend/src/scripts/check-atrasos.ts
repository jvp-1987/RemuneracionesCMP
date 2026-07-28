import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const atrasos = await prisma.atrasos.findMany();
  const times = atrasos.map(a => a.tiempo_descuento);
  console.log('Tiempos actuales en DB:');
  console.log(times);
}

main().finally(() => prisma.$disconnect());
