import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const atrasos = await prisma.atrasos.findMany({
    where: { minutos: { gt: 0 } },
    select: { id: true, minutos: true, tiempo_descuento: true }
  });
  console.log(`Encontrados ${atrasos.length} atrasos.`);
  console.log(atrasos);
}

main().finally(() => prisma.$disconnect());
