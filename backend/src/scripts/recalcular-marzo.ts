import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getParam(clave: string, defaultValue: string): Promise<string> {
  const p = await prisma.parametro.findUnique({ where: { clave } });
  return p ? p.valor : defaultValue;
}

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

  const sueldoBase = Number(escala.sueldo_base);
  const asignacionAPS = sueldoBase; 
  const subtotalBaseAps = sueldoBase + asignacionAPS;

  const porZona = Number(funcionario.centro_salud?.porcentaje_zona || 0);
  const porDificil = Number(funcionario.centro_salud?.porcentaje_dificil || 0);

  const montoZona = sueldoBase * (porZona / 100);
  const montoDificil = subtotalBaseAps * (porDificil / 100);

  const total = subtotalBaseAps + montoZona + montoDificil;
  const divisor = parseFloat(await getParam('VALOR_HORA_DIVISOR', '190'));
  return total / divisor;
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
  const vFuera = parseFloat(await getParam('VIATICO_FUERA_COMUNA', '9000'));
  const vDentro = parseFloat(await getParam('VIATICO_DENTRO_COMUNA', '7000'));
  
  for (const v of viaticos) {
    const monto = v.tipo_destino.toLowerCase().includes('fuera') ? vFuera : vDentro;
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
