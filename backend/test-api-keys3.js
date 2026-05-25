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
  
  for (let i = 0; i < f.liquidaciones.length; i++) {
     const keys = Object.keys(f.liquidaciones[i].detalle_json);
     console.log(`Liq ${i}: Periodo ${f.liquidaciones[i].periodo.mes}/${f.liquidaciones[i].periodo.anio}, keys count: ${keys.length}`);
     if (keys.includes('TIPO CONTRATO EN PERSONAL')) {
       console.log('   -> Found TIPO CONTRATO EN PERSONAL!');
     }
  }
}
main().finally(() => prisma.$disconnect());
