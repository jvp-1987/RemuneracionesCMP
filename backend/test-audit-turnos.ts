import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const turno = await prisma.turnosUrgencia.findFirst();
  console.log('Turno:', turno);
  
  if (turno) {
    const logs = await prisma.historialAuditoria.findMany({
      where: { registro_id: turno.id, tipo_modulo: 'TURNO_URGENCIA' }
    });
    console.log('Logs:', logs);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
