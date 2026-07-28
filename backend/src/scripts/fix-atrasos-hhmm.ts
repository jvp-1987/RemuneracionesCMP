import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Buscando registros de Atrasos con formato HH:MM...');
  const atrasos = await prisma.atrasos.findMany();
  let count = 0;

  for (const atraso of atrasos) {
    const timeStr = String(atraso.tiempo_descuento || '').trim();
    if (timeStr.includes(':')) {
      const parts = timeStr.split(':');
      const h = parseInt(parts[0].replace(/[^0-9]/g, '')) || 0;
      const m = parseInt(parts[1].replace(/[^0-9]/g, '')) || 0;
      const correctMinutes = (h * 60) + m;

      if (atraso.minutos !== correctMinutes) {
        console.log(`Corrigiendo Atraso ID ${atraso.id}: ${timeStr} -> ${correctMinutes} minutos (antes: ${atraso.minutos})`);
        await prisma.atrasos.update({
          where: { id: atraso.id },
          data: {
            minutos: correctMinutes
          }
        });
        count++;
      }
    }
  }

  console.log(`Se corrigieron ${count} registros de atrasos.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
