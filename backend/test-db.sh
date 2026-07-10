#!/bin/bash
cd "/Users/juanvidalp/Documents/REMUNERACIONES 2026/backend"
source .env
npx ts-node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const logs = await prisma.historialAuditoria.findMany({
    where: { tipo_modulo: 'TURNO_URGENCIA' },
    take: 5,
    orderBy: { fecha: 'desc' }
  });
  console.log(logs);
}
run().catch(console.error).finally(() => prisma.$disconnect());
"
