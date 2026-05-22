const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const liquidaciones = await prisma.liquidacionMensual.findMany({
      include: {
        funcionario: { include: { centro_salud: true } }
      }
    });
    
    let missingCentros = 0;
    liquidaciones.forEach(l => {
      if (!l.funcionario.centro_salud) {
        missingCentros++;
      }
    });
    
    console.log("Missing centros:", missingCentros);
  } catch(e) { console.error(e); } finally { await prisma.$disconnect(); }
}
main();
