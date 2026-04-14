import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const data = [
    // CATEGORIA A
    { category: 'A', level: 1, v50: 25807, v25: 21506 },
    { category: 'A', level: 2, v50: 24767, v25: 20639 },
    { category: 'A', level: 3, v50: 23020, v25: 19183 },
    { category: 'A', level: 4, v50: 22978, v25: 19148 },
    { category: 'A', level: 5, v50: 22482, v25: 18735 },
    { category: 'A', level: 6, v50: 20519, v25: 17100 },
    { category: 'A', level: 7, v50: 19463, v25: 16219 },
    { category: 'A', level: 8, v50: 18406, v25: 15339 },
    { category: 'A', level: 9, v50: 17671, v25: 14725 },
    { category: 'A', level: 10, v50: 16595, v25: 13829 },
    { category: 'A', level: 11, v50: 15518, v25: 12932 },
    { category: 'A', level: 12, v50: 14442, v25: 12035 },
    { category: 'A', level: 13, v50: 13339, v25: 11116 },
    { category: 'A', level: 14, v50: 12805, v25: 10671 },
    { category: 'A', level: 15, v50: 11212, v25: 9344 },

    // CATEGORIA B
    { category: 'B', level: 1, v50: 21609, v25: 18008 },
    { category: 'B', level: 2, v50: 19867, v25: 16556 },
    { category: 'B', level: 3, v50: 19056, v25: 15880 },
    { category: 'B', level: 4, v50: 18246, v25: 15205 },
    { category: 'B', level: 5, v50: 17435, v25: 14529 },
    { category: 'B', level: 6, v50: 16624, v25: 13853 },
    { category: 'B', level: 7, v50: 16106, v25: 13422 },
    { category: 'B', level: 8, v50: 15003, v25: 12502 },
    { category: 'B', level: 9, v50: 14454, v25: 12045 },
    { category: 'B', level: 10, v50: 13628, v25: 11357 },
    { category: 'B', level: 11, v50: 12802, v25: 10668 },
    { category: 'B', level: 12, v50: 11976, v25: 9980 },
    { category: 'B', level: 13, v50: 11150, v25: 9292 },
    { category: 'B', level: 14, v50: 10324, v25: 8603 },
    { category: 'B', level: 15, v50: 9498, v25: 7915 },

    // CATEGORIA C
    { category: 'C', level: 1, v50: 10573, v25: 8811 },
    { category: 'C', level: 2, v50: 10161, v25: 8467 },
    { category: 'C', level: 3, v50: 9749, v25: 8124 },
    { category: 'C', level: 4, v50: 9336, v25: 7780 },
    { category: 'C', level: 5, v50: 8924, v25: 7437 },
    { category: 'C', level: 6, v50: 8869, v25: 7391 },
    { category: 'C', level: 7, v50: 8100, v25: 6750 },
    { category: 'C', level: 8, v50: 7687, v25: 6406 },
    { category: 'C', level: 9, v50: 7275, v25: 6062 },
    { category: 'C', level: 10, v50: 6862, v25: 5719 },
    { category: 'C', level: 11, v50: 6450, v25: 5375 },
    { category: 'C', level: 12, v50: 6038, v25: 5032 },
    { category: 'C', level: 13, v50: 5626, v25: 4688 },
    { category: 'C', level: 14, v50: 5213, v25: 4344 },
    { category: 'C', level: 15, v50: 4801, v25: 4001 },

    // CATEGORIA D
    { category: 'D', level: 1, v50: 9442, v25: 7868 },
    { category: 'D', level: 2, v50: 9088, v25: 7573 },
    { category: 'D', level: 3, v50: 8733, v25: 7278 },
    { category: 'D', level: 4, v50: 8379, v25: 6983 },
    { category: 'D', level: 5, v50: 8025, v25: 6688 },
    { category: 'D', level: 6, v50: 7826, v25: 6522 },
    { category: 'D', level: 7, v50: 7471, v25: 6225 },
    { category: 'D', level: 8, v50: 6963, v25: 5803 },
    { category: 'D', level: 9, v50: 6759, v25: 5632 },
    { category: 'D', level: 10, v50: 6255, v25: 5212 },
    { category: 'D', level: 11, v50: 5901, v25: 4917 },
    { category: 'D', level: 12, v50: 5547, v25: 4622 },
    { category: 'D', level: 13, v50: 5193, v25: 4327 },
    { category: 'D', level: 14, v50: 4839, v25: 4032 },
    { category: 'D', level: 15, v50: 4624, v25: 3853 },

    // CATEGORIA E
    { category: 'E', level: 1, v50: 8951, v25: 7459 },
    { category: 'E', level: 2, v50: 8620, v25: 7183 },
    { category: 'E', level: 3, v50: 8131, v25: 6776 },
    { category: 'E', level: 4, v50: 7958, v25: 6632 },
    { category: 'E', level: 5, v50: 7627, v25: 6356 },
    { category: 'E', level: 6, v50: 7296, v25: 6080 },
    { category: 'E', level: 7, v50: 6966, v25: 5805 },
    { category: 'E', level: 8, v50: 6635, v25: 5529 },
    { category: 'E', level: 9, v50: 6304, v25: 5253 },
    { category: 'E', level: 10, v50: 5973, v25: 4978 },
    { category: 'E', level: 11, v50: 5642, v25: 4702 },
    { category: 'E', level: 12, v50: 5312, v25: 4426 },
    { category: 'E', level: 13, v50: 4981, v25: 4151 },
    { category: 'E', level: 14, v50: 4650, v25: 3875 },
    { category: 'E', level: 15, v50: 4319, v25: 3599 },

    // CATEGORIA F
    { category: 'F', level: 1, v50: 7927, v25: 6606 },
    { category: 'F', level: 2, v50: 7635, v25: 6363 },
    { category: 'F', level: 3, v50: 7341, v25: 6117 },
    { category: 'F', level: 4, v50: 7052, v25: 5876 },
    { category: 'F', level: 5, v50: 6760, v25: 5633 },
    { category: 'F', level: 6, v50: 6468, v25: 5390 },
    { category: 'F', level: 7, v50: 6177, v25: 5147 },
    { category: 'F', level: 8, v50: 5885, v25: 4904 },
    { category: 'F', level: 9, v50: 5593, v25: 4661 },
    { category: 'F', level: 10, v50: 5302, v25: 4418 },
    { category: 'F', level: 11, v50: 5010, v25: 4175 },
    { category: 'F', level: 12, v50: 4718, v25: 3932 },
    { category: 'F', level: 13, v50: 4426, v25: 3689 },
    { category: 'F', level: 14, v50: 4135, v25: 3446 },
    { category: 'F', level: 15, v50: 3843, v25: 3202 },
  ];

  console.log('Iniciando carga de escalas...');

  for (const item of data) {
    await prisma.escalaHorasExtras.upsert({
      where: {
        categoria_nivel_anio: {
          categoria: item.category,
          nivel: item.level,
          anio: 2026,
        },
      },
      update: {
        valor_25: item.v25,
        valor_50: item.v50,
      },
      create: {
        categoria: item.category,
        nivel: item.level,
        valor_25: item.v25,
        valor_50: item.v50,
        anio: 2026,
      },
    });
  }

  console.log('Carga completada.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
