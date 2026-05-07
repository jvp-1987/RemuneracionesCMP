import { PrismaClient } from '@prisma/client';
import { FuncionariosService } from '../src/funcionarios/funcionarios.service';
import { CalculosService } from '../src/calculos/calculos.service';
import * as fs from 'fs';

const prisma = new PrismaClient();
const service = new FuncionariosService(prisma as any, new CalculosService(prisma as any));

async function main() {
  const filePath = '/Users/juanvidalp/Documents/REMUNERACIONES  2026/BASE44_IMPORT_FUNCIONARIOS.xlsx';
  console.log(`Leyendo archivo: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.error('El archivo no existe.');
    process.exit(1);
  }

  const buffer = fs.readFileSync(filePath);
  
  console.log('Iniciando importación real...');
  try {
    const result = await service.importarExcel(buffer, false);
    console.log('Resultado:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error durante la importación:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
