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
  console.log(f.liquidaciones.length > 0);
  console.log(f.liquidaciones[0].detalle_json != null);
  console.log(Object.keys(f.liquidaciones[0].detalle_json).find(k => k.toUpperCase().includes('TIPO CONTRATO EN PERSONAL')));
}
main().finally(() => prisma.$disconnect());
