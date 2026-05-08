
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.periodo.count();
  console.log(`Total periodos: ${count}`);
  
  if (count === 0) {
    console.log('No hay periodos. Generando 2026...');
    for (let mes = 1; mes <= 12; mes++) {
      await prisma.periodo.create({
        data: { mes, anio: 2026, estado: 'Abierto' }
      });
    }
    console.log('Periodos 2026 creados.');
  } else {
    const p2026 = await prisma.periodo.findMany({ where: { anio: 2026 } });
    if (p2026.length === 0) {
        console.log('No hay periodos 2026. Generando...');
        for (let mes = 1; mes <= 12; mes++) {
          await prisma.periodo.create({
            data: { mes, anio: 2026, estado: 'Abierto' }
          });
        }
        console.log('Periodos 2026 creados.');
    } else {
        console.log('Ya existen periodos para 2026.');
    }
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
