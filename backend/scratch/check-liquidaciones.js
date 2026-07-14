const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Get all periods with counts of liquidaciones
  const periods = await prisma.periodo.findMany({
    include: {
      _count: {
        select: {
          liquidaciones: true,
          consolidados: true
        }
      }
    }
  });

  console.log("=== PERIODS WITH COUNTS ===");
  console.log(periods.map(p => ({
    id: p.id,
    mes: p.mes,
    anio: p.anio,
    estado: p.estado,
    tipo: p.tipo,
    liquidacionesCount: p._count.liquidaciones,
    consolidadosCount: p._count.consolidados
  })));

  // Let's check if there are any liquidaciones in July 2026 (mes: 7, anio: 2026)
  const julyPeriod = periods.find(p => p.mes === 7 && p.anio === 2026);
  if (julyPeriod) {
    const countsByCentro = await prisma.liquidacionMensual.findMany({
      where: { periodo_id: julyPeriod.id },
      include: {
        funcionario: {
          include: { centro_salud: true }
        }
      },
      take: 10
    });
    console.log(`\n=== SAMPLE LIQUIDACIONES FOR JULY 2026 (Total: ${julyPeriod._count.liquidaciones}) ===`);
    console.log(countsByCentro.map(l => ({
      rut: l.funcionario_rut,
      nombre: l.funcionario.nombre_completo,
      centro: l.funcionario.centro_salud ? l.funcionario.centro_salud.nombre : 'SIN CENTRO',
      total_haberes: l.total_haberes,
      total_descuentos: l.total_descuentos,
      monto_liquido: l.monto_liquido
    })));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
