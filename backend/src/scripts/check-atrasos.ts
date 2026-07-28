import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const atrasos = await prisma.atrasos.findMany({
    orderBy: { id: 'desc' },
    take: 20
  });
  console.log('Últimos 20 Atrasos:');
  atrasos.forEach(a => {
    console.log(`ID: ${a.id} | Minutos: ${a.minutos} | TiempoDescuento: ${a.tiempo_descuento} | Rut: ${a.funcionario_rut}`);
  });
}

main().finally(() => prisma.$disconnect());
