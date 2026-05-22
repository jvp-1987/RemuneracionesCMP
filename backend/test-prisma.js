const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const period = await prisma.periodo.findFirst({
      where: { liquidaciones: { some: {} } },
      orderBy: [ { anio: 'desc' }, { mes: 'desc' } ]
    });
    console.log("Period:", period);
    
    if (!period) return;
    
    const aggr = await prisma.liquidacionMensual.aggregate({
      where: { periodo_id: period.id },
      _sum: {
        sueldo_base: true,
        total_haberes: true,
        total_descuentos: true,
        monto_liquido: true,
        monto_he_pagado: true,
        monto_viaticos_real: true
      }
    });
    console.log("Aggregate:", aggr);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
