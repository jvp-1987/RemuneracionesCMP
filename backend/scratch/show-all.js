const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Get all periods
  const periodos = await prisma.periodo.findMany();
  console.log("=== ALL PERIODS ===");
  console.log(periodos);

  // 2. Count records in other tables
  const counts = {
    usuarios: await prisma.usuario.count(),
    centros: await prisma.centroSalud.count(),
    funcionarios: await prisma.funcionario.count(),
    consolidados: await prisma.consolidado.count(),
    horasExtras: await prisma.horasExtras.count(),
    turnos: await prisma.turnosUrgencia.count(),
    viaticos: await prisma.viaticos.count(),
    atrasos: await prisma.atrasos.count(),
    procedimientos: await prisma.procedimientos.count(),
    historial: await prisma.historialAuditoria.count(),
    liquidaciones: await prisma.liquidacionMensual.count()
  };
  console.log("\n=== TABLE COUNTS ===");
  console.log(counts);

  // 3. If there are consolidados, list them with period info
  const consolidados = await prisma.consolidado.findMany({
    include: {
      periodo: true,
      centro_salud: true
    }
  });
  console.log("\n=== ALL CONSOLIDADOS ===");
  console.log(consolidados.map(c => ({
    id: c.id,
    periodo: `${c.periodo.mes}/${c.periodo.anio} (${c.periodo.tipo})`,
    centro: c.centro_salud.nombre,
    estado: c.estado_actual_enum,
    vb_control: c.vb_control_interno,
    vb_finanzas: c.vb_finanzas,
    vb_contabilidad: c.vb_contabilidad
  })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
