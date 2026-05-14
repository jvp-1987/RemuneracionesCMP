import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('Regularizando centros y dependientes...');

  const hierarchy = [
    {
      parent: 'CESFAM PANGUIPULLI',
      dependents: [
        'POSTA RURAL BOCATOMA',
        'POSTA RURAL CAYUMAPU',
        'POSTA RURAL MELEFQUEN',
        'POSTA RURAL HUITAG',
        'SAR PANGUIPULLI'
      ]
    },
    {
      parent: 'CESFAM COÑARIPE',
      dependents: [
        'CECOSF LIQUIÑE'
      ]
    },
    {
      parent: 'CESFAM CHOSHUENCO',
      dependents: [
        'CECOSF NELTUME',
        'POSTA RURAL LAGONELTUME',
        'POSTA RURAL PIREHEUICO'
      ]
    },
    {
      parent: 'ADMINISTRACION CENTRAL',
      dependents: [
        'DEPARTAMENTO DE PERSONAL (RRHH)',
        'CENTRAL',
        'FARMACIA COMUNAL'
      ]
    }
  ];

  // Mapping for existing names that might need renaming
  const nameMapping: Record<string, string> = {
    'POSTA MELEFQUEN': 'POSTA RURAL MELEFQUEN',
    'POSTA BOCATOMA': 'POSTA RURAL BOCATOMA',
    'POSTA HUITAG': 'POSTA RURAL HUITAG',
    'POSTA CAYUMAPU': 'POSTA RURAL CAYUMAPU',
    'SAR': 'SAR PANGUIPULLI',
    'POSTA LAGO NELTUME': 'POSTA RURAL LAGONELTUME',
    'POSTA PIRIHUEICO': 'POSTA RURAL PIREHEUICO',
  };

  // 1. Rename existing centers if needed
  for (const [oldName, newName] of Object.entries(nameMapping)) {
    const existing = await prisma.centroSalud.findFirst({ where: { nombre: oldName } });
    if (existing) {
      await prisma.centroSalud.update({
        where: { id: existing.id },
        data: { nombre: newName }
      });
      console.log(`Renombrado: ${oldName} -> ${newName}`);
    }
  }

  // 2. Process hierarchy
  for (const group of hierarchy) {
    // Find or create parent
    let parent = await prisma.centroSalud.findFirst({ where: { nombre: group.parent } });
    if (!parent) {
      parent = await prisma.centroSalud.create({
        data: {
          nombre: group.parent,
          porcentaje_zona: group.parent.includes('PANGUIPULLI') || group.parent.includes('CENTRAL') ? 15 : 30,
          porcentaje_dificil: 0
        }
      });
      console.log(`Creado Parent: ${group.parent}`);
    }

    for (const depName of group.dependents) {
      let dep = await prisma.centroSalud.findFirst({ where: { nombre: depName } });
      if (dep) {
        await prisma.centroSalud.update({
          where: { id: dep.id },
          data: { parent_id: parent.id }
        });
        console.log(`Asignado dependiente: ${depName} -> ${group.parent}`);
      } else {
        await prisma.centroSalud.create({
          data: {
            nombre: depName,
            parent_id: parent.id,
            porcentaje_zona: parent.porcentaje_zona,
            porcentaje_dificil: 0 // Default, can be updated later if known
          }
        });
        console.log(`Creado y asignado dependiente: ${depName} -> ${group.parent}`);
      }
    }
  }

  // 3. Delete duplicates or "extra" centers seen in the UI but not in my list
  // Actually, I should be careful. Let's just focus on the ones in the spreadsheet.
  // The UI screenshot showed "CENTRO DE SALUD FAMILIAR PANGUIPULLI" as a duplicate of "CESFAM PANGUIPULLI".
  
  const duplicates = [
    { old: 'CENTRO DE SALUD FAMILIAR PANGUIPULLI', target: 'CESFAM PANGUIPULLI' },
    { old: 'CENTRO DE SALUD FAMILIAR COÑARIPE', target: 'CESFAM COÑARIPE' },
    { old: 'CENTRO DE SALUD FAMILIAR CHOSHUENCO', target: 'CESFAM CHOSHUENCO' },
    { old: 'POSTA RURAL LIQUIÑE', target: 'CECOSF LIQUIÑE' },
    { old: 'FARMACIA COMUNAL PANGUIPULLI', target: 'FARMACIA COMUNAL' },
    { old: 'DEPARTAMENTO DE SALUD', target: 'ADMINISTRACION CENTRAL' }
  ];

  for (const dup of duplicates) {
    const oldCenter = await prisma.centroSalud.findFirst({ where: { nombre: dup.old } });
    const targetCenter = await prisma.centroSalud.findFirst({ where: { nombre: dup.target } });

    if (oldCenter && targetCenter) {
      console.log(`Mergeando ${dup.old} into ${dup.target}...`);
      // Update references in other tables
      await prisma.funcionario.updateMany({
        where: { centro_salud_id: oldCenter.id },
        data: { centro_salud_id: targetCenter.id }
      });
      await prisma.consolidado.updateMany({
        where: { centro_salud_id: oldCenter.id },
        data: { centro_salud_id: targetCenter.id }
      });
      await prisma.usuario.updateMany({
        where: { centro_salud_id: oldCenter.id },
        data: { centro_salud_id: targetCenter.id }
      });
      
      // Delete old center
      await prisma.centroSalud.delete({ where: { id: oldCenter.id } });
      console.log(`Eliminado duplicado: ${dup.old}`);
    } else if (oldCenter && !targetCenter) {
        // If the target doesn't exist yet, just rename it
        await prisma.centroSalud.update({
            where: { id: oldCenter.id },
            data: { nombre: dup.target }
        });
        console.log(`Renombrado duplicado solitario: ${dup.old} -> ${dup.target}`);
    }
  }

  console.log('Regularización completada.');
  await prisma.$disconnect();
}

run().catch(console.error);
