import { PrismaClient } from '@prisma/client';
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function run() {
  const filePath = path.join(__dirname, '../../../Tabla de Bonificaciones por Establecimiento.xlsx');
  if (!fs.existsSync(filePath)) {
    console.error('Archivo no encontrado:', filePath);
    process.exit(1);
  }

  const workbook = xlsx.read(fs.readFileSync(filePath));
  const sheetName = workbook.SheetNames[0];
  const data = xlsx.utils.sheet_to_json<any[]>(workbook.Sheets[sheetName], { header: 1 });

  console.log('Procesando bonificaciones por establecimiento...');

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 3) continue;

    const nombreEst = String(row[0] || '').trim();
    const porcentajeDificil = Number(row[1] || 0) * 100; // 0.1 -> 10%
    const porcentajeZona = Number(row[2] || 0) * 100;    // 0.15 -> 15%

    if (nombreEst) {
      console.log(`Lote: ${nombreEst} - Dificil: ${porcentajeDificil}%, Zona: ${porcentajeZona}%`);
      await prisma.centroSalud.upsert({
        where: { id: i }, 
        update: { 
          nombre: nombreEst,
          porcentaje_dificil: porcentajeDificil, 
          porcentaje_zona: porcentajeZona 
        },
        create: { 
          id: i,
          nombre: nombreEst, 
          porcentaje_dificil: porcentajeDificil, 
          porcentaje_zona: porcentajeZona 
        },
      });
    }
  }

  console.log('Bonificaciones importadas con éxito.');
  await prisma.$disconnect();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
