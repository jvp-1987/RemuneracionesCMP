import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const funcionario = await prisma.funcionario.findFirst();
  if (!funcionario) {
    console.log('No funcionarios found to attach mock data.');
    return;
  }

  console.log(`Injecting mock data for ${funcionario.nombre_completo} (${funcionario.rut})`);

  await prisma.contrato.create({
    data: {
      funcionario_rut: funcionario.rut,
      tipo_contrato: 'Plazo Fijo',
      fecha_inicio: new Date('2026-01-01'),
      fecha_termino: new Date('2026-12-31'),
      cargo: 'Médico Cirujano',
      jornada_horas: 44,
      estado: 'Vigente'
    }
  });

  await prisma.ausentismo.create({
    data: {
      funcionario_rut: funcionario.rut,
      tipo_ausentismo: 'Permiso Sin Goce Sueldo',
      fecha_inicio: new Date('2026-04-10'),
      fecha_termino: new Date('2026-04-15'),
      dias_habiles: 4,
      descuento_aplicable: true,
      monto_descuento_calculado: 150000,
      estado_validacion: 'APROBADO'
    }
  });

  await prisma.asignacionEspecial.create({
    data: {
      funcionario_rut: funcionario.rut,
      tipo_asignacion: 'Asignación de Responsabilidad',
      nro_resolucion: 'RES-10293',
      fecha_inicio: new Date('2026-02-01'),
      fecha_termino: new Date('2026-08-31'),
      monto_o_porcentaje: 250000,
      estado_validacion: 'APROBADO'
    }
  });

  console.log('Mock data injected!');
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
