const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const f = await prisma.funcionario.findUnique({
    where: { rut: '15293253-7' },
    include: {
      liquidaciones: {
        take: 24,
        orderBy: [{ periodo: { anio: 'desc' } }, { periodo: { mes: 'desc' } }],
        include: { periodo: true }
      }
    }
  });
  console.log("Most recent liquidacion keys:", Object.keys(f.liquidaciones[0].detalle_json).filter(k => k.includes('CONTRATO') || k.includes('CALIDAD')));
  if (f.liquidaciones.length > 1) {
    console.log("Second liquidacion keys:", Object.keys(f.liquidaciones[1].detalle_json).filter(k => k.includes('CONTRATO') || k.includes('CALIDAD')));
  }
}
main().finally(() => prisma.$disconnect());
