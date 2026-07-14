const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const viaticos = await prisma.viaticos.findMany({
    orderBy: { id: 'asc' }
  });
  console.log('Total viaticos:', viaticos.length);
  if (viaticos.length > 0) {
    console.log('Primeros 5:', viaticos.slice(0, 5));
    console.log('Últimos 10:', viaticos.slice(-10));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
