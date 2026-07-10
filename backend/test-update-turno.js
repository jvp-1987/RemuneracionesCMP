const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mock service dependencies
const { TurnosUrgenciaService } = require('./dist/turnos-urgencia/turnos-urgencia.service');
const { AuditService } = require('./dist/audit/audit.service');

async function main() {
  const audit = new AuditService(prisma);
  const service = new TurnosUrgenciaService(prisma, audit);

  // Find a turno
  const turno = await prisma.turnosUrgencia.findFirst({
    include: { consolidado: true }
  });
  if (!turno) {
    console.log("No turnos found in DB");
    return;
  }

  console.log("Found Turno:", turno.id, "Current observations:", turno.observaciones);

  const mockUser = {
    nombre: 'Gestor Test',
    rol_enum: 'CENTRO_SALUD'
  };

  const newObs = "Observacion modificada en test " + Date.now();
  console.log("Updating to observations:", newObs);

  const res = await service.update(turno.id, { observaciones: newObs }, mockUser);
  console.log("Update returned:", res.observaciones);

  // Check audit log
  const auditLogs = await prisma.historialAuditoria.findMany({
    where: { tipo_modulo: 'TURNO_URGENCIA', registro_id: turno.id }
  });
  console.log("Audit Logs found:", auditLogs);
}

main().catch(console.error).finally(() => prisma.$disconnect());
