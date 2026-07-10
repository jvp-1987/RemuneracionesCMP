const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const start = Date.now();
  console.log("Connecting to database...");
  try {
    // Test connection
    await prisma.$queryRaw`SELECT 1`;
    const connTime = Date.now() - start;
    console.log(`Connected successfully in ${connTime}ms`);

    const tables = [
      'usuario',
      'centroSalud',
      'funcionario',
      'periodo',
      'consolidado',
      'horasExtras',
      'turnosUrgencia',
      'viaticos',
      'atrasos',
      'procedimientos'
    ];

    console.log("\nRecord counts:");
    for (const table of tables) {
      const startQuery = Date.now();
      const count = await prisma[table].count();
      const queryTime = Date.now() - startQuery;
      console.log(`- ${table}: ${count} records (took ${queryTime}ms)`);
    }

  } catch (err) {
    console.error("Database connection/query error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
