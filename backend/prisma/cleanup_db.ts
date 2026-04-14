import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- INICIANDO LIMPIEZA TOTAL DE DATOS ---');

  // El orden es importante por las claves foráneas
  console.log('Cleanup: HorasExtras...');
  await prisma.horasExtras.deleteMany({});

  console.log('Cleanup: TurnosUrgencia...');
  await prisma.turnosUrgencia.deleteMany({});

  console.log('Cleanup: Viaticos...');
  await prisma.viaticos.deleteMany({});

  console.log('Cleanup: Atrasos...');
  await prisma.atrasos.deleteMany({});

  console.log('Cleanup: Procedimientos...');
  await prisma.procedimientos.deleteMany({});

  console.log('Cleanup: HistorialAuditoria...');
  await prisma.historialAuditoria.deleteMany({});

  console.log('Cleanup: Consolidados...');
  await prisma.consolidado.deleteMany({});

  console.log('Cleanup: Funcionarios...');
  await prisma.funcionario.deleteMany({});

  console.log('--- LIMPIEZA COMPLETADA CON ÉXITO ---');
}

main()
  .catch((e) => {
    console.error('Error durante la limpieza:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
