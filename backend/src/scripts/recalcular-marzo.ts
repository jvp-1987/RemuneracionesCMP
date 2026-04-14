import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Duplicamos la lógica simple aquí para el script standalone
async function calcularValorHora(rut: string) {
  const funcionario = await prisma.funcionario.findUnique({
    where: { rut },
    include: { centro_salud: true }
  });

  if (!funcionario || !funcionario.categoria_aps || !funcionario.nivel_aps) return 0;

  const escala = await prisma.escalaSueldo.findUnique({
    where: { categoria_nivel: { categoria: funcionario.categoria_aps, nivel: funcionario.nivel_aps } }
  });

  if (!escala) return 0;

  const base = Number(escala.sueldo_base);
  const aps = base;
  const suma = base + aps;
  const porZona = Number(funcionario.centro_salud?.porcentaje_zona || 0) / 100;
  const porDificil = Number(funcionario.centro_salud?.porcentaje_dificil || 0) / 100;

  const total = suma + (suma * porZona) + (suma * porDificil);
  return total / 176;
}

async function run() {
  console.log('Recalculando montos para Marzo 2026...');

  // 1. Horas Extras
  const horas = await prisma.horasExtras.findMany();
  for (const h of horas) {
    const vh = await calcularValorHora(h.funcionario_rut);
    const m25 = Number(h.cantidad_25) * vh * 1.25;
    const m50 = Number(h.cantidad_50) * vh * 1.50;
    await prisma.horasExtras.update({
      where: { id: h.id },
      data: { monto_25: m25, monto_50: m50 }
    });
  }

  // 2. Viáticos
  const viaticos = await prisma.viaticos.findMany();
  for (const v of viaticos) {
    const monto = v.tipo_destino.toLowerCase().includes('fuera') ? 9000 : 7000;
    await prisma.viaticos.update({
      where: { id: v.id },
      data: { monto_calculado: monto }
    });
  }

  // 3. Atrasos
  const atrasos = await prisma.atrasos.findMany();
  for (const a of atrasos) {
    const vh = await calcularValorHora(a.funcionario_rut);
    let mins = 0;
    if (a.tiempo_descuento.toUpperCase().includes('MINUTO')) {
      mins = parseInt(a.tiempo_descuento);
    }
    const monto = (vh / 60) * mins;
    await prisma.atrasos.update({
      where: { id: a.id },
      data: { monto_descuento: monto }
    });
  }

  console.log('Recálculo completado.');
  await prisma.$disconnect();
}

run().catch(console.error);
