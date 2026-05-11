import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const summary = await prisma.liquidacionMensual.groupBy({
    by: ['periodo_id'],
    _count: { id: true },
    _max: { fecha_importacion: true }
  });
  
  const periods = await prisma.periodo.findMany({
    where: { id: { in: summary.map(s => s.periodo_id) } }
  });

  console.log('Resumen de Liquidaciones por Periodo:');
  summary.forEach(s => {
    const p = periods.find(p => p.id === s.periodo_id);
    console.log(`Periodo ID ${s.periodo_id}: ${p?.mes}/${p?.anio} - Cantidad: ${s._count.id} - Ultima Importacion: ${s._max.fecha_importacion}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
