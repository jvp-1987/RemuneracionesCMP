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
  console.log("Most recent liquidacion keys:", Object.keys(f.liquidaciones[0].detalle_json));
  console.log("Is it validationEntries?", f.liquidaciones[0].detalle_json.validationEntries ? true : false);
  console.log("Second liquidacion validationEntries?", f.liquidaciones[1]?.detalle_json?.validationEntries ? true : false);
}
main().finally(() => prisma.$disconnect());
