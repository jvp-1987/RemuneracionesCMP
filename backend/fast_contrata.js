const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const liquidaciones = await prisma.liquidacionMensual.findMany({
    select: {
      funcionario: { select: { rut: true, nombre_completo: true } },
      detalle_json: true
    }
  });

  const map = new Map();
  for (const l of liquidaciones) {
     const detalle = l.detalle_json || {};
     const keys = Object.keys(detalle);
     let ck = keys.find(k => k.toUpperCase().includes('TIPO CONTRATO EN PERSONAL'));
     if (!ck) ck = keys.find(k => k.toUpperCase().includes('TIPO DE CONTRATO') || k.toUpperCase().includes('CALIDAD JURIDICA'));
     if (!ck) ck = keys.find(k => k.toUpperCase().includes('CONTRATO') && !k.toUpperCase().includes('FECHA') && !k.toUpperCase().includes('Nº') && !k.toUpperCase().includes('N°'));
     
     if (ck && detalle[ck]) {
       const val = String(detalle[ck]).trim().toUpperCase();
       if (val === 'CONTRATA') {
         map.set(l.funcionario.rut, l.funcionario.nombre_completo);
       }
     }
  }
  for (const [rut, nombre] of map.entries()) {
    console.log(`RUT: ${rut}, Nombre: ${nombre}`);
  }
}
main().finally(() => prisma.$disconnect());
