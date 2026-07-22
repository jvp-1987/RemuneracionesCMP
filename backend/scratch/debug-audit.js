const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const logs = await prisma.historialAuditoria.findMany({
    where: { campo_afectado: 'observaciones_25' },
    orderBy: { fecha: 'desc' },
    take: 5
  });
  console.log("Logs:", logs);

  for (const log of logs) {
    const he = await prisma.horasExtras.findUnique({ where: { id: log.registro_id } });
    console.log(`HE for log ${log.id}:`, he ? `Exists (id: ${he.id}, func: ${he.funcionario_rut})` : `DELETED!`);
  }
}
run().finally(() => prisma.$disconnect());
