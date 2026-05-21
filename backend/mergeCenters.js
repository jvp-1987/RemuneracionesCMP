const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const mapping = {
  // CENTRO DE SALUD FAMILIAR PANGUIPULLI -> CESFAM Panguipulli
  8: 1,
  // CENTRO DE SALUD FAMILIAR CHOSHUENCO -> CESFAM Choshuenco
  9: 2,
  // CENTRO DE SALUD FAMILIAR COÑARIPE -> CESFAM Coñaripe
  4: 3,
  // SAR -> SAR PANGUIPULLI
  23: 6,
  // POSTA MELEFQUEN -> POSTA RURAL MELEFQUEN
  18: 17,
  // POSTA BOCATOMA -> POSTA RURAL BOCATOMA
  20: 14,
  // POSTA CAYUMAPU -> POSTA RURAL CAYUMAPU
  21: 12,
  // POSTA HUITAG -> POSTA RURAL HUITAG
  22: 11
};

async function main() {
  console.log("Iniciando unificación de centros de salud...");

  for (const [fromIdStr, toId] of Object.entries(mapping)) {
    const fromId = parseInt(fromIdStr);
    
    // 1. Move Funcionarios
    const funcResult = await prisma.funcionario.updateMany({
      where: { centro_salud_id: fromId },
      data: { centro_salud_id: toId }
    });
    console.log(`[ID ${fromId} -> ${toId}] Funcionarios movidos: ${funcResult.count}`);

    // 2. Move Usuarios
    const userResult = await prisma.usuario.updateMany({
      where: { centro_salud_id: fromId },
      data: { centro_salud_id: toId }
    });
    console.log(`[ID ${fromId} -> ${toId}] Usuarios movidos: ${userResult.count}`);

    // 3. Move Consolidados
    const consResult = await prisma.consolidado.updateMany({
      where: { centro_salud_id: fromId },
      data: { centro_salud_id: toId }
    });
    console.log(`[ID ${fromId} -> ${toId}] Consolidados movidos: ${consResult.count}`);

    // 4. Try to delete the duplicate center
    try {
      await prisma.centroSalud.delete({
        where: { id: fromId }
      });
      console.log(`Centro duplicado ID ${fromId} eliminado exitosamente.`);
    } catch (err) {
      console.error(`Error eliminando centro duplicado ID ${fromId}. Puede que tenga otras dependencias:`, err.message);
    }
  }

  console.log("Unificación completada.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
