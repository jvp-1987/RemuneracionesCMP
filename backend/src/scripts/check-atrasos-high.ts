import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const atrasos = await prisma.atrasos.findMany({
    where: { minutos: { gte: 100 } },
    select: { id: true, minutos: true, tiempo_descuento: true, funcionario_rut: true }
  });
  console.log(`Encontrados ${atrasos.length} atrasos con minutos >= 100.`);
  console.log(atrasos);
}

main().finally(() => prisma.$disconnect());
