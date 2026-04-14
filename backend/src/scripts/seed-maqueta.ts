import { PrismaClient, EstadoValidacion } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('Seeding mock data for validation testing...');

  // 1. Periodo
  const periodo = await prisma.periodo.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, mes: 3, anio: 2026, estado: 'Abierto' }
  });

  // 2. Centro (CESFAM Panguipulli)
  const centro = await prisma.centroSalud.findFirst({ where: { nombre: { contains: 'PANGUIPULLI' } } });
  if (!centro) {
    console.error('No se encontró el centro Panguipulli. Ejecuta sync-maestro.ts primero.');
    return;
  }

  // 3. Consolidado
  const consolidado = await prisma.consolidado.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      centro_salud_id: centro.id,
      periodo_id: periodo.id,
      estado_actual_enum: 'Borrador'
    }
  });

  // 4. Funcionario (Cualquiera del maestro)
  const funcs = await prisma.funcionario.findMany({ take: 5 });
  if (funcs.length === 0) {
    console.error('No hay funcionarios. Ejecuta sync-maestro.ts primero.');
    return;
  }

  // 5. Programa
  const prog = await prisma.programa.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, nombre: 'Programa APS', categoria_enum: 'Programas APS' }
  });

  // 6. Horas Extras
  for (let i = 0; i < funcs.length; i++) {
    await prisma.horasExtras.create({
      data: {
        consolidado_id: consolidado.id,
        funcionario_rut: funcs[i].rut,
        programa_id: prog.id,
        cantidad_25: 10 + i,
        cantidad_50: 5 + i,
        monto_25: (10 + i) * 5000,
        monto_50: (5 + i) * 6000,
        estado_25: EstadoValidacion.PENDIENTE,
        estado_50: EstadoValidacion.PENDIENTE,
        fecha_inicio: new Date('2026-03-16'),
        fecha_termino: new Date('2026-04-15'),
        observaciones_25: 'Carga de prueba ' + (i + 1),
        observaciones_50: null,
      }
    });
  }

  console.log('Seeding completed successfully.');
  await prisma.$disconnect();
}

run().catch(console.error);
