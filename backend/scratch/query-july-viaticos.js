const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const consolidadosJulio = await prisma.consolidado.findMany({
    where: {
      periodo_id: 10
    },
    include: {
      viaticos: true
    }
  });
  
  let viaticosJulio = [];
  consolidadosJulio.forEach(c => {
    if (c.viaticos.length > 0) {
      viaticosJulio = viaticosJulio.concat(c.viaticos);
    }
  });
  
  // console.log('Viaticos en periodo 10 (Julio):', JSON.stringify(viaticosJulio, null, 2));
  
  const idsToDelete = viaticosJulio.map(v => v.id);
  console.log('IDs a eliminar:', idsToDelete);
  
  if (idsToDelete.length > 0) {
    const deleted = await prisma.viaticos.deleteMany({
      where: {
        id: { in: idsToDelete }
      }
    });
    console.log('Se eliminaron:', deleted);
  } else {
    console.log('No hay viaticos para eliminar');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
