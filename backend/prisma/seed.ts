import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('123456', 10);

  const admin = await prisma.usuario.upsert({
    where: { rut: '16.853.223-7' }, // Cambia esto por tu RUT real
    update: {},
    create: {
      rut: '16.853.223-7',
      nombre: 'Administrador Inicial',
      email: 'juan.vidal@cmpanguipulli.com',
      password: password,
      rol_enum: 'ADMIN_MAESTRO',
    },
  });

  console.log('Usuario administrador creado:', admin);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
