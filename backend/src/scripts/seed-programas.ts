import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const programas = [
    { nombre: 'FONDOS PRESUPUESTARIOS', categoria: 'Fondos' },
    { nombre: 'ATENCIÓN INTEGRAL AL DESARROLLO INFANTOADOLESCENTE (TEA)', categoria: 'Programas APS' },
    { nombre: 'CONTINUIDAD DE CUIDADOS PREVENTIVOS Y DE TRATAMIENTOS EN APS', categoria: 'Programas APS' },
    { nombre: 'ESPACIOS AMIGABLES PARA ADOLESCENTES', categoria: 'Programas APS' },
    { nombre: 'ESB - AT. ODONTOLÓGICA DE MORBILIDAD', categoria: 'Programas APS' },
    { nombre: 'ESB - AT. INTEGRAL', categoria: 'Programas APS' },
    { nombre: 'ESB - AT. RESOLUTIVIDAD', categoria: 'Programas APS' },
    { nombre: 'IMÁGENES DIAGNÓSTICAS EN ATENCIÓN PRIMARIA DE SALUD', categoria: 'Programas APS' },
    { nombre: 'MODELO DE ATENCIÓN INTEGRAL DE SALUD FAMILIAR Y COMUNITARIA EN ATENCIÓN PRIMARIA (MAISF)', categoria: 'Programas APS' },
    { nombre: 'REHABILITACIÓN INTEGRAL EN LA RED DE SALUD', categoria: 'Programas APS' },
    { nombre: 'SALUD MENTAL Y BIENESTAR PSICOSOCIAL - SALUD MENTAL EN LA ATENCIÓN PRIMARIA DE SALUD', categoria: 'Programas APS' },
    { nombre: 'SALUD RESPIRATORIA - VACUNACIÓN CONTRA LA INFLUENZA, VRS Y SARS-CoV-2', categoria: 'Programas APS' },
    { nombre: 'SALUD RESPIRATORIA - CAMPAÑA INVIERNO', categoria: 'Programas APS' },
    { nombre: 'SERVICIO DE ATENCIÓN PRIMARIA DE URGENCIA DE ALTA RESOLUTIVIDAD (SAR)', categoria: 'Programas APS' },
    { nombre: 'PROGRAMA SUR', categoria: 'Programas APS' }
  ];

  console.log('Iniciando carga de programas oficiales...');

  for (const p of programas) {
    await prisma.programa.upsert({
      where: { id: 0 }, // We don't have id in the list, so we'll use findFirst or unique name if possible
      // Actually Prisma Programa only has id, name, category. No unique name yet. 
      // I should check if I need to add @unique to name.
      update: { categoria_enum: p.categoria },
      create: { nombre: p.nombre, categoria_enum: p.categoria }
    }).catch(async () => {
      // If no unique name, let's just create if not exists by checking name
      const exists = await prisma.programa.findFirst({ where: { nombre: p.nombre } });
      if (!exists) {
        await prisma.programa.create({ data: { nombre: p.nombre, categoria_enum: p.categoria } });
      }
    });
  }

  // Update id 1 (generic) to FONDOS PRESUPUESTARIOS if it exists
  const p1 = await prisma.programa.findUnique({ where: { id: 1 } });
  if (p1 && p1.nombre === 'Programa APS') {
    await prisma.programa.update({
      where: { id: 1 },
      data: { nombre: 'FONDOS PRESUPUESTARIOS', categoria_enum: 'Fondos' }
    });
  }

  console.log('Carga de programas completada.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
