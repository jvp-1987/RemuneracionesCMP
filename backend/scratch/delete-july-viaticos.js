const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Borrando viáticos de julio...');
  
  // Eliminamos los IDs del 372 al 379 correspondientes al mes de julio duplicados
  const result = await prisma.viaticos.deleteMany({
    where: {
      id: {
        in: [372, 373, 374, 375, 376, 377, 378, 379]
      }
    }
  });

  console.log('Resultado:', result);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
