const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const liquidaciones = await prisma.liquidacionMensual.findMany({
    where: {
      periodo: { id: 1 } // Trying for the latest or just take a sample
    },
    take: 500,
    select: { detalle_json: true }
  });

  const keysSet = new Set();
  
  liquidaciones.forEach(l => {
    const detalle = l.detalle_json;
    if (!detalle) return;
    Object.keys(detalle).forEach(k => {
      const val = Number(detalle[k]);
      if (!isNaN(val) && val > 0) {
        keysSet.add(k);
      }
    });
  });

  const keys = Array.from(keysSet).sort();
  console.log(JSON.stringify(keys, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
