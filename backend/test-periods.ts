import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const periodIds = [1, 2, 3, 4];
  console.log("Starting cleanup for periods:", periodIds);

  // 1. Delete Liquidaciones
  const deletedLiqs = await prisma.liquidacionMensual.deleteMany({
    where: {
      periodo_id: { in: periodIds }
    }
  });
  console.log(`Deleted ${deletedLiqs.count} records from LiquidacionMensual.`);

  // 2. Find Consolidados for these periods
  const consolidados = await prisma.consolidado.findMany({
    where: {
      periodo_id: { in: periodIds }
    },
    select: { id: true }
  });
  const consolidadoIds = consolidados.map(c => c.id);

  if (consolidadoIds.length > 0) {
    // 3. Delete dependent records of Consolidados
    await prisma.horasExtras.deleteMany({ where: { consolidado_id: { in: consolidadoIds } } });
    await prisma.viaticos.deleteMany({ where: { consolidado_id: { in: consolidadoIds } } });
    await prisma.atrasos.deleteMany({ where: { consolidado_id: { in: consolidadoIds } } });
    await prisma.turnosUrgencia.deleteMany({ where: { consolidado_id: { in: consolidadoIds } } });
    await prisma.procedimientos.deleteMany({ where: { consolidado_id: { in: consolidadoIds } } });

    // 4. Delete Consolidados
    const deletedConsolidados = await prisma.consolidado.deleteMany({
      where: {
        id: { in: consolidadoIds }
      }
    });
    console.log(`Deleted ${deletedConsolidados.count} records from Consolidado.`);
  } else {
    console.log("No Consolidados found for these periods.");
  }

  await prisma.$disconnect();
  console.log("Cleanup completed successfully!");
}

run();

