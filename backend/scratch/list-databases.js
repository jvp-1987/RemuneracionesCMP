const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: "mysql://root:password123@localhost:3306/mysql"
      }
    }
  });

  const databases = await prisma.$queryRawUnsafe('SHOW DATABASES;');
  console.log("=== DATABASES ===");
  console.log(databases);

  await prisma.$disconnect();
}

main().catch(console.error);
