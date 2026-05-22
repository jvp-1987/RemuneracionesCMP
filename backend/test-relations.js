const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const liquidaciones = await prisma.liquidacionMensual.findMany({
      include: { funcionario: true }
    });
    const missing = liquidaciones.filter(l => !l.funcionario);
    console.log("Total liquidaciones:", liquidaciones.length);
    console.log("Missing funcionario:", missing.length);
    if (missing.length > 0) console.log(missing[0]);
  } catch(e) { console.error(e); } finally { await prisma.$disconnect(); }
}
main();
