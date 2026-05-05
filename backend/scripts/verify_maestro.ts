import { PrismaClient } from '@prisma/client';
import { RemuneracionesService } from '../src/remuneraciones/remuneraciones.service';
import * as fs from 'fs';

const prisma = new PrismaClient();
const service = new RemuneracionesService(prisma as any);

async function main() {
  const filePath = '/Users/juanvidalp/Documents/REMUNERACIONES  2026/MAESTRO SALUD ENERO 2026.xls';
  const periodoId = 1; // Abril 2026 (según lo encontrado en DB)

  if (!fs.existsSync(filePath)) {
    console.error('El archivo no existe.');
    process.exit(1);
  }

  const buffer = fs.readFileSync(filePath);
  
  console.log('Iniciando importación de planilla maestra...');
  try {
    const result = await service.importarMaestroMensual(buffer, periodoId);
    console.log('Resultado:', result);
    
    // Verificar un funcionario
    const check = await prisma.liquidacionMensual.findFirst({
      where: { periodo_id: periodoId }
    });
    console.log('Verificación DB (Muestra):', check);
    
  } catch (error) {
    console.error('Error durante la importación:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
