import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function recalculate() {
  console.log('Iniciando recálculo masivo de Horas Extras...');

  const records = await prisma.horasExtras.findMany({
    include: {
      funcionario: true,
    },
  });

  const escalas = await prisma.escalaHorasExtras.findMany({
    where: { anio: 2026 },
  });

  let updatedCount = 0;

  for (const record of records) {
    const { categoria_aps, nivel_aps } = record.funcionario;
    
    if (!categoria_aps || !nivel_aps) {
      console.warn(`Funcionario ${record.funcionario_rut} no tiene categoría o nivel definido. Saltando.`);
      continue;
    }

    const escala = escalas.find(e => e.categoria === categoria_aps && e.nivel === nivel_aps);

    if (!escala) {
      console.warn(`No se encontró escala para ${categoria_aps} Nivel ${nivel_aps}. Saltando.`);
      continue;
    }

    const nuevoMonto25 = Number(record.cantidad_25) * Number(escala.valor_25);
    const nuevoMonto50 = Number(record.cantidad_50) * Number(escala.valor_50);

    await prisma.horasExtras.update({
      where: { id: record.id },
      data: {
        monto_25: nuevoMonto25,
        monto_50: nuevoMonto50,
      },
    });
    updatedCount++;
  }

  console.log(`Recálculo terminado. ${updatedCount} registros actualizados con la escala oficial.`);
}

recalculate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
