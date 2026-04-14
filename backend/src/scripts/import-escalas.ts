import { PrismaClient } from '@prisma/client';
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function run() {
  const filePath = path.join(__dirname, '../../../sueldos CATEGORIAS Y NIVELES 2026.xls');
  if (!fs.existsSync(filePath)) {
    console.error('Archivo no encontrado:', filePath);
    process.exit(1);
  }

  const workbook = xlsx.read(fs.readFileSync(filePath));
  const sheetName = workbook.SheetNames[0];
  const data = xlsx.utils.sheet_to_json<any[]>(workbook.Sheets[sheetName], { header: 1 });

  console.log('Procesando escalas de sueldos...');

  let currentCategory = '';
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const firstCell = String(row[0] || '').replace(/\u00A0/g, ' ').trim();
    if (firstCell.startsWith('Categoria :')) {
      // Extraer letra (A, B, C, etc.) limpiando espacios especiales (\u00A0)
      currentCategory = firstCell.split(':')[1].replace(/\u00A0/g, ' ').trim().split(' ')[0];
      console.log(`Encontrada categoría: [${currentCategory}]`);
    }

    // Si la fila empieza con un número y tenemos categoría, es un nivel
    const nivel = Number(row[0]);
    if (currentCategory && !isNaN(nivel) && nivel >= 1 && nivel <= 15) {
      const sueldoBase = Number(row[1]);
      if (!isNaN(sueldoBase)) {
        await prisma.escalaSueldo.upsert({
          where: { categoria_nivel: { categoria: currentCategory, nivel: nivel } },
          update: { sueldo_base: sueldoBase },
          create: { categoria: currentCategory, nivel: nivel, sueldo_base: sueldoBase },
        });
      }
    }
  }

  console.log('Escalas importadas con éxito.');
  await prisma.$disconnect();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
