import { PrismaClient } from '@prisma/client';
import * as xlsx from 'xlsx';

const prisma = new PrismaClient();

async function main() {
  const workbook = xlsx.readFile('./Planilla Global CAS SALUD MARZO.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData: any[][] = xlsx.utils.sheet_to_json<any>(sheet, { header: 1 });
  
  const headerRowIndex = rawData.findIndex(row => 
    Array.isArray(row) && row.some(c => {
      const s = String(c || '').toUpperCase();
      return s.includes('RUN') || s.includes('RUT');
    })
  );

  const headerRow = rawData[headerRowIndex];
  const headers = headerRow.map((c: any) => {
    if (!c) return '';
    return String(c).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  });
  console.log('Headers:', headers);
  
  const rutIdx = headers.findIndex((h: string) => h && (h === 'run' || h === 'rut'));
  let profIdx = headers.findIndex((h: string) => h === 'cargo');
  if (profIdx === -1) {
    profIdx = headers.findIndex((h: string) => h && (h.includes('especialidad') || h.includes('profesion') || h === 'escalafon'));
  }
  const estIdx = headers.findIndex((h: string) => h === 'establecimiento');

  console.log('Indices:', { rutIdx, profIdx, estIdx });

  const row = rawData[headerRowIndex + 1];
  console.log('Row 0 data:', {
    rut: row[rutIdx],
    cargo: row[profIdx],
    est: row[estIdx]
  });
}

main().finally(() => prisma.$disconnect());
