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
    let nombreEst = String(row.establecimiento || '').trim().toLowerCase();
    let mappedEst = 'CESFAM PANGUIPULLI';
    if (nombreEst.includes('neltume') && !nombreEst.includes('lago')) mappedEst = 'CECOSF NELTUME';
    else if (nombreEst.includes('pireheuico') || nombreEst.includes('pirihueico')) mappedEst = 'POSTA RURAL PIREHEUICO';
    else if (nombreEst.includes('lago neltume')) mappedEst = 'POSTA RURAL LAGONELTUME';
    else if (nombreEst.includes('choshuenco')) mappedEst = 'CESFAM CHOSHUENCO';
    else if (nombreEst.includes('liquiñe') || nombreEst.includes('liquine')) mappedEst = 'CECOSF LIQUIÑE';
    else if (nombreEst.includes('coñaripe') || nombreEst.includes('conaripe')) mappedEst = 'CESFAM COÑARIPE';
    else if (nombreEst.includes('melefquen')) mappedEst = 'POSTA RURAL MELEFQUEN';
    else if (nombreEst.includes('bocatoma')) mappedEst = 'POSTA RURAL BOCATOMA';
    else if (nombreEst.includes('huitag')) mappedEst = 'POSTA RURAL HUITAG';
    else if (nombreEst.includes('cayumapu')) mappedEst = 'POSTA RURAL CAYUMAPU';
    else if (nombreEst.includes('sar')) mappedEst = 'SAR PANGUIPULLI';
    else if (nombreEst.includes('personal') || nombreEst.includes('rrhh')) mappedEst = 'DEPARTAMENTO DE PERSONAL (RRHH)';
    else if (nombreEst.includes('farmacia')) mappedEst = 'FARMACIA COMUNAL';
    else if (nombreEst.includes('central') || nombreEst.includes('adm central') || nombreEst.includes('depsa') || nombreEst.includes('eleam')) {
      mappedEst = 'CENTRAL';
    }

    const centro = await prisma.centroSalud.findFirst({
      where: { nombre: { startsWith: mappedEst } }
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
