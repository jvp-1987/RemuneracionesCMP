import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const params = [
    { clave: 'VIATICO_DENTRO_COMUNA', valor: '7000', modulo: 'VIATICOS' },
    { clave: 'VIATICO_FUERA_COMUNA', valor: '9000', modulo: 'VIATICOS' },
    { clave: 'VALOR_HORA_DIVISOR', valor: '190', modulo: 'CALCULOS' },
  ];

  for (const p of params) {
    await prisma.parametro.upsert({
      where: { clave: p.clave },
      update: {},
      create: p
    });
  }
  console.log('Parámetros inicializados correctamente.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
