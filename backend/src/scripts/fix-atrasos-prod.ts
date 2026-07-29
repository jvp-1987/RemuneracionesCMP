import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- SCRIPT DE REPARACIÓN DE ATRASOS HISTÓRICOS ---');
  console.log('Buscando registros con formato HH:MM o erróneos (>= 100 minutos)...');

  const atrasos = await prisma.atrasos.findMany();
  let count = 0;

  for (const atraso of atrasos) {
    const timeStr = String(atraso.tiempo_descuento || '').trim();
    let correctMinutes = atraso.minutos;
    let needsUpdate = false;

    // 1. Si explícitamente tiene ":" (ej. "01:30")
    if (timeStr.includes(':')) {
      const parts = timeStr.split(':');
      const h = parseInt(parts[0].replace(/[^0-9]/g, '')) || 0;
      const m = parseInt(parts[1].replace(/[^0-9]/g, '')) || 0;
      const calc = (h * 60) + m;
      if (calc !== atraso.minutos) {
        correctMinutes = calc;
        needsUpdate = true;
      }
    } 
    // 2. Si se guardó mal como un número plano (ej. 130) por el bug anterior
    else if (atraso.minutos >= 100) {
      const h = Math.floor(atraso.minutos / 100);
      const m = atraso.minutos % 100;
      
      // Validamos que los minutos tengan sentido (0 a 59)
      if (m >= 0 && m < 60) {
        const calc = (h * 60) + m;
        // Si el cálculo da diferente (ej. 130 -> 1h 30m -> 90 mins)
        if (calc !== atraso.minutos) {
          correctMinutes = calc;
          needsUpdate = true;
        }
      }
    }

    if (needsUpdate) {
      console.log(`Corrigiendo ID ${atraso.id}: ${timeStr} -> ${correctMinutes} min (estaba en ${atraso.minutos})`);
      await prisma.atrasos.update({
        where: { id: atraso.id },
        data: { minutos: correctMinutes }
      });
      count++;
    }
  }

  console.log(`\n¡Finalizado! Se corrigieron ${count} registros de atrasos.`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
