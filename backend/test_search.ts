import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const query = "JUAN";
  const result = await prisma.funcionario.findMany({
    where: { OR: [{ rut: { contains: query } }, { nombre_completo: { contains: query } }] },
    take: 5,
    select: { rut: true, nombre_completo: true, categoria_aps: true, nivel_aps: true }
  });
  console.log('Case Sensitive "JUAN":', result.length);
  
  const queryLower = "Juan";
  const resultLower = await prisma.funcionario.findMany({
    where: { OR: [{ rut: { contains: queryLower } }, { nombre_completo: { contains: queryLower } }] },
    take: 5,
    select: { rut: true, nombre_completo: true, categoria_aps: true, nivel_aps: true }
  });
  console.log('Case Insensitive "Juan":', resultLower.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
