import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial data...');

  // 1. Centro de Salud
  const centro = await prisma.centroSalud.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      nombre: 'CESFAM Panguipulli',
    },
  });
  console.log('Centro de Salud created/found:', centro.nombre);

  // 2. Usuario Administrador
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@salud.cl' },
    update: {},
    create: {
      rut: '1-9',
      nombre: 'ADMIN CENTRAL',
      email: 'admin@salud.cl',
      rol_enum: 'Nivel 1',
      centro_salud_id: centro.id,
    },
  });
  console.log('Admin user created/found:', admin.nombre);

  // 3. Programas identificados en el Excel
  const programas = [
    { nombre: 'Presupuestaria', categoria: 'Presupuestaria' },
    { nombre: 'SAR', categoria: 'Programas APS' },
    { nombre: 'ECICEP', categoria: 'Programas APS' },
    { nombre: 'Cirugía Menor', categoria: 'Programas APS' },
    { nombre: 'Salud Mental', categoria: 'Programas APS' },
  ];

  for (const prog of programas) {
    const p = await prisma.programa.upsert({
      where: { id: programas.indexOf(prog) + 1 },
      update: { nombre: prog.nombre, categoria_enum: prog.categoria },
      create: {
        id: programas.indexOf(prog) + 1,
        nombre: prog.nombre,
        categoria_enum: prog.categoria,
      },
    });
    console.log('Programa created/found:', p.nombre);
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
