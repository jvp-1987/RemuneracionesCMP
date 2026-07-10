import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const liquidaciones = await prisma.liquidacionMensual.findMany({
    select: { detalle_json: true }
  });

  const types = new Set<string>();
  for (const l of liquidaciones) {
    const detalle: any = l.detalle_json || {};
    const keys = Object.keys(detalle);
    
    let ck = keys.find(k => k.toUpperCase().includes('TIPO CONTRATO EN PERSONAL'));
    if (!ck) ck = keys.find(k => k.toUpperCase().includes('TIPO DE CONTRATO') || k.toUpperCase().includes('CALIDAD JURIDICA'));
    if (!ck) ck = keys.find(k => k.toUpperCase().includes('CONTRATO') && !k.toUpperCase().includes('FECHA') && !k.toUpperCase().includes('Nº') && !k.toUpperCase().includes('N°'));
    
    if (ck && detalle[ck]) {
      types.add(String(detalle[ck]).trim().toUpperCase());
    }
  }

  console.log('Contract types found in Maestro:', Array.from(types));
}

main().finally(() => prisma.$disconnect());
