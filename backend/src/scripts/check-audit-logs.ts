import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Buscando registros de auditoría recientes sobre cambios de estado o observaciones...");
  const logs = await prisma.historialAuditoria.findMany({
    where: {
      OR: [
        { campo_afectado: { in: ['estado_25', 'estado_50', 'estado', 'observaciones_25', 'observaciones_50', 'concepto', 'justificacion'] } },
        { campo_afectado: 'REGISTRO_ELIMINADO' }
      ]
    },
    orderBy: { fecha: 'desc' },
    take: 100
  });

  console.log(JSON.stringify(logs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
