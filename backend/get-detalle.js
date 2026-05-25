const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const f = await prisma.funcionario.findFirst({
    where: { nombre_completo: { contains: 'ALEJANDRA VIVIANA ISABEL RIOS GONZALEZ' } },
    include: { liquidaciones: true }
  });
  console.log(f.liquidaciones[0].detalle_json);
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
