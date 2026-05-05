import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Generando escala de Horas Extras desde Sueldos Base 2026...');

  const sueldosBase = await prisma.escalaSueldo.findMany();
  console.log(`Encontrados ${sueldosBase.length} registros en EscalaSueldo.`);

  for (const escala of sueldosBase) {
    const { categoria, nivel, sueldo_base } = escala;
    
    // Formula: (Base + APS) / 176
    // APS = Base (Confirmado 1:1)
    const baseTotal = Number(sueldo_base) * 2;
    const valorHora = baseTotal / 176;
    
    const v25 = valorHora * 1.25;
    const v50 = valorHora * 1.50;

    await prisma.escalaHorasExtras.upsert({
      where: {
        categoria_nivel_anio: {
          categoria,
          nivel,
          anio: 2026
        }
      },
      update: {
        valor_25: v25,
        valor_50: v50
      },
      create: {
        categoria,
        nivel,
        anio: 2026,
        valor_25: v25,
        valor_50: v50
      }
    });
  }

  console.log('Escala de Horas Extras generada con éxito.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
