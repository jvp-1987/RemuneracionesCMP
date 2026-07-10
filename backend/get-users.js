const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.usuario.findMany({
    select: { email: true, nombre: true, rol_enum: true }
  });
  console.log("Users:", users);
  await prisma.$disconnect();
}
main();
