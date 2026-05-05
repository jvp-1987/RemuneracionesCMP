import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- INICIANDO LIMPIEZA DE DATOS DE PRUEBA ---');

  try {
    // 1. Eliminar Transacciones (Dependen de Consolidado y Funcionario)
    console.log('Eliminando Horas Extras...');
    await prisma.horasExtras.deleteMany({});

    console.log('Eliminando Turnos de Urgencia...');
    await prisma.turnosUrgencia.deleteMany({});

    console.log('Eliminando Viáticos...');
    await prisma.viaticos.deleteMany({});

    console.log('Eliminando Atrasos/Permisos...');
    await prisma.atrasos.deleteMany({});

    console.log('Eliminando Procedimientos...');
    await prisma.procedimientos.deleteMany({});

    // 2. Eliminar Consolidados (Dependen de Periodo/Usuario/Centro)
    console.log('Eliminando Consolidados...');
    await prisma.consolidado.deleteMany({});

    // 3. Eliminar Historial de Auditoría
    console.log('Eliminando Historial de Auditoría...');
    await prisma.historialAuditoria.deleteMany({});

    // 4. Eliminar Maestro de Funcionarios
    console.log('Eliminando Maestro de Funcionarios...');
    await prisma.funcionario.deleteMany({});

    console.log('--------------------------------------------');
    console.log('✅ LIMPIEZA COMPLETADA CON ÉXITO');
    console.log('Base de datos lista para subir datos reales.');
    console.log('--------------------------------------------');

  } catch (error) {
    console.error('❌ ERROR DURANTE LA LIMPIEZA:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
