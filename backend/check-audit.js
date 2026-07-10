const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const modulos = await prisma.historialAuditoria.groupBy({
    by: ['tipo_modulo'],
    _count: { id: true }
  });
  console.log("=== DISTINCT MODULOS ===");
  console.log(modulos);

  const turnosLogs = await prisma.historialAuditoria.findMany({
    where: { tipo_modulo: 'TURNO_URGENCIA' },
    orderBy: { fecha: 'desc' },
    take: 10
  });
  console.log("\n=== TURNO_URGENCIA LOGS ===");
  console.log(turnosLogs);
}

main().catch(console.error).finally(() => prisma.$disconnect());
