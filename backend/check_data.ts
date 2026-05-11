import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.liquidacionMensual.count();
  const latest = await prisma.liquidacionMensual.findFirst({
    include: { periodo: true }
  });
  console.log('Total Liquidaciones:', count);
  console.log('Latest Periodo:', latest?.periodo);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
