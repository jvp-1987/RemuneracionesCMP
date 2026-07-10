const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== PERIODS ===");
  const periods = await prisma.periodo.findMany({
    orderBy: [{ anio: 'desc' }, { mes: 'desc' }]
  });
  console.log(periods);

  console.log("\n=== CONSOLIDADOS ===");
  const consolidados = await prisma.consolidado.findMany({
    include: {
      periodo: true,
      centro_salud: true
    }
  });
  console.log(consolidados);

  console.log("\n=== LIQUIDACIONES BY PERIOD ===");
  const liqs = await prisma.liquidacionMensual.groupBy({
    by: ['periodo_id'],
    _count: { id: true }
  });
  console.log(liqs);
}

main().catch(console.error).finally(() => prisma.$disconnect());
