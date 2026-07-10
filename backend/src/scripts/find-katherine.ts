import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const rut = '19285386-9';
  console.log(`Buscando a la funcionaria con RUT: ${rut}`);

  const funcionario = await prisma.funcionario.findUnique({
    where: { rut }
  });
  
  if (funcionario) {
    console.log('Funcionario encontrado en la DB:', funcionario);
  } else {
    console.log('Funcionario NO encontrado en la DB principal.');
  }

  const horasExtras = await prisma.horasExtras.findMany({ where: { funcionario_rut: rut } });
  console.log(`Horas Extras encontradas: ${horasExtras.length}`);
  if (horasExtras.length > 0) console.log(horasExtras);

  const viaticos = await prisma.viaticos.findMany({ where: { funcionario_rut: rut } });
  console.log(`Viaticos encontrados: ${viaticos.length}`);
  if (viaticos.length > 0) console.log(viaticos);

  const turnos = await prisma.turnosUrgencia.findMany({ where: { funcionario_rut: rut } });
  console.log(`Turnos encontrados: ${turnos.length}`);
  if (turnos.length > 0) console.log(turnos);

  // Buscar si hay registros de auditoría que mencionen este RUT, o buscar por nombre si no encontramos nada
  const nameToSearch = 'KATHERINE MACARENA VEGA AGUILAR';
  
  const auditoria = await prisma.$queryRaw`
    SELECT * FROM HistorialAuditoria 
    ORDER BY fecha DESC LIMIT 50;
  `;
  // It's hard to search raw JSON for RUT if we don't know the registro_id, 
  // but if we got the registro_ids from above, we could.
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
