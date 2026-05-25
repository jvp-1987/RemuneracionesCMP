const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const f = await prisma.funcionario.findFirst({
    where: { rut: '19272365-5' },
    include: {
      liquidaciones: {
        take: 6,
        orderBy: [{ periodo: { anio: 'desc' } }, { periodo: { mes: 'desc' } }],
        include: { periodo: true }
      }
    }
  });

  for (const liq of f.liquidaciones) {
     const keys = Object.keys(liq.detalle_json);
     console.log(`Periodo ${liq.periodo.mes}/${liq.periodo.anio}:`);
     const k1 = keys.find(k => k.toUpperCase().includes('TIPO CONTRATO EN PERSONAL'));
     const k2 = keys.find(k => k.toUpperCase().includes('TIPO DE CONTRATO') || k.toUpperCase().includes('CALIDAD JURIDICA'));
     const k3 = keys.find(k => k.toUpperCase().includes('CONTRATO') && !k.toUpperCase().includes('FECHA') && !k.toUpperCase().includes('Nº') && !k.toUpperCase().includes('N°'));
     
     if (k1) console.log(`  ${k1} = ${liq.detalle_json[k1]}`);
     if (k2) console.log(`  ${k2} = ${liq.detalle_json[k2]}`);
     if (k3) console.log(`  ${k3} = ${liq.detalle_json[k3]}`);
  }
}

main().finally(() => prisma.$disconnect());
