const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Find period for July 2026
  const periodos = await prisma.periodo.findMany({
    where: {
      OR: [
        { mes: 6, anio: 2026 },
        { mes: 7, anio: 2026 }
      ]
    }
  });
  console.log("=== PERIODS ===");
  console.log(periodos);

  const julyPeriod = periodos.find(p => p.mes === 7);
  const junePeriod = periodos.find(p => p.mes === 6);

  if (!julyPeriod) {
    console.log("No July 2026 period found!");
    return;
  }

  // 2. Find consolidados for July 2026
  const consolidados = await prisma.consolidado.findMany({
    where: { periodo_id: julyPeriod.id },
    include: {
      centro_salud: true,
      usuario_gestor: true
    }
  });

  console.log("\n=== CONSOLIDADOS JULY 2026 ===");
  console.log(consolidados.map(c => ({
    id: c.id,
    centro: c.centro_salud.nombre,
    estado: c.estado_actual_enum,
    gestor: c.usuario_gestor ? c.usuario_gestor.nombre : 'SIN GESTOR',
    hasReloj: !!c.reloj_data
  })));

  // 3. Find all viaticos in July 2026
  const viaticosJuly = await prisma.viaticos.findMany({
    where: {
      consolidado: { periodo_id: julyPeriod.id }
    },
    include: {
      funcionario: true,
      consolidado: {
        include: { centro_salud: true }
      }
    }
  });

  console.log("\n=== VIATICOS JULY 2026 ===");
  console.log(viaticosJuly.map(v => ({
    id: v.id,
    rut: v.funcionario_rut,
    nombre: v.funcionario.nombre_completo,
    centro: v.consolidado.centro_salud.nombre,
    tipo: v.tipo_destino,
    monto: v.monto_calculado,
    justificacion: v.justificacion,
    concepto: v.concepto
  })));

  // 4. Find audit logs for these viaticos
  if (viaticosJuly.length > 0) {
    const viaticosIds = viaticosJuly.map(v => v.id);
    const auditLogs = await prisma.historialAuditoria.findMany({
      where: {
        tipo_modulo: 'VIATICO',
        registro_id: { in: viaticosIds }
      },
      orderBy: { fecha: 'asc' }
    });
    console.log("\n=== AUDIT LOGS FOR VIATICOS ===");
    console.log(auditLogs);
  }

  // 5. Let's also check if they existed in June 2026
  if (junePeriod) {
    const viaticosJune = await prisma.viaticos.findMany({
      where: {
        consolidado: { periodo_id: junePeriod.id }
      },
      include: {
        funcionario: true,
        consolidado: {
          include: { centro_salud: true }
        }
      }
    });
    console.log("\n=== VIATICOS JUNE 2026 ===");
    console.log(viaticosJune.map(v => ({
      id: v.id,
      rut: v.funcionario_rut,
      nombre: v.funcionario.nombre_completo,
      centro: v.consolidado.centro_salud.nombre,
      tipo: v.tipo_destino,
      monto: v.monto_calculado,
      justificacion: v.justificacion,
      concepto: v.concepto
    })));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
