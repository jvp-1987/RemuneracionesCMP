import { PrismaClient } from '@prisma/client';
import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function run() {
  const filePath = path.join(__dirname, '../../../plantilla_maestra_funcionarios_cmp FINAL.xlsx');
  if (!fs.existsSync(filePath)) {
    console.error('Archivo no encontrado:', filePath);
    process.exit(1);
  }

  const workbook = xlsx.read(fs.readFileSync(filePath));
  const sheetName = 'Funcionarios';
  const data = xlsx.utils.sheet_to_json<any>(workbook.Sheets[sheetName]);

  console.log(`Procesando ${data.length} funcionarios del maestro...`);

  for (const row of data) {
    const rut = String(row.rut || '').trim().replace(/\./g, '').toUpperCase();
    if (!rut) continue;

    const categoria = String(row.categoria_aps || '').replace(/\u00A0/g, ' ').trim().toUpperCase();
    const nivel = Number(row.nivel_aps);
    const jornada = Number(row.jornada_horas);
    const nombreCompleto = String(row.nombre || '').trim();

    // Mapeo: Buscar el centro de salud por nombre aproximado
    let nombreEst = String(row.establecimiento || '').trim().toUpperCase();
    if (nombreEst.includes('SAR')) nombreEst = 'SAR PANGUIPULLI';
    if (nombreEst.includes('COÑARIPE') && nombreEst.includes('CESFAM')) nombreEst = 'CESFAM COÑARIPE';
    if (nombreEst.includes('CHOSHUENCO') && nombreEst.includes('CESFAM')) nombreEst = 'CESFAM CHOSHUENCO';
    if (nombreEst.includes('NELTUME') && !nombreEst.includes('LAGO')) nombreEst = 'CECOSF NELTUME';
    if (nombreEst.includes('LAGO NELTUME')) nombreEst = 'POSTA RURAL LAGONELTUME';
    if (nombreEst.includes('PIREHEUICO') || nombreEst.includes('PIRIHUEICO')) nombreEst = 'POSTA RURAL PIREHEUICO';
    if (nombreEst.includes('LIQUIÑE')) nombreEst = 'CECOSF LIQUIÑE';
    if (nombreEst.includes('BOCATOMA')) nombreEst = 'POSTA RURAL BOCATOMA';
    if (nombreEst.includes('CAYUMAPU')) nombreEst = 'POSTA RURAL CAYUMAPU';
    if (nombreEst.includes('MELEFQUEN')) nombreEst = 'POSTA RURAL MELEFQUEN';
    if (nombreEst.includes('HUITAG')) nombreEst = 'POSTA RURAL HUITAG';
    
    // Admin Central dependents
    if (nombreEst.includes('RRHH') || nombreEst.includes('PERSONAL')) nombreEst = 'DEPARTAMENTO DE PERSONAL (RRHH)';
    if (nombreEst.includes('FARMACIA')) nombreEst = 'FARMACIA COMUNAL';
    if (nombreEst.includes('CENTRAL') && !nombreEst.includes('CESFAM')) nombreEst = 'CENTRAL';

    const centro = await prisma.centroSalud.findFirst({
      where: { nombre: { startsWith: nombreEst } }
    });

    // Actualizar o crear funcionario
    await prisma.funcionario.upsert({
      where: { rut },
      update: {
        nombre_completo: nombreCompleto,
        categoria_aps: categoria,
        nivel_aps: nivel,
        jornada_horas: jornada,
        centro_salud_id: centro ? centro.id : null
      },
      create: {
        rut,
        nombre_completo: nombreCompleto,
        categoria_aps: categoria,
        nivel_aps: nivel,
        jornada_horas: jornada,
        centro_salud_id: centro ? centro.id : null,
        profesion_enum: String(row.titulo_profesion || 'No Especificado')
      }
    });
  }

  console.log('Sincronización de funcionarios completada.');
  await prisma.$disconnect();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
