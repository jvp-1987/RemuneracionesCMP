import { PrismaClient } from '@prisma/client';
import { ReportesService } from './src/reportes/reportes.service';

const prisma = new PrismaClient();
const service = new ReportesService(prisma as any);

async function run() {
  try {
    console.log("Fetching HR Stats...");
    const hr = await service.getHRStats([5, 6]);
    console.log("HR:", JSON.stringify(hr).substring(0, 100));

    console.log("Fetching Financial Stats...");
    const fin = await service.getFinancialStats([5, 6]);
    console.log("FIN:", JSON.stringify(fin).substring(0, 100));

    console.log("Fetching Centros Stats...");
    const centros = await service.getCentrosStats([5, 6]);
    console.log("CENTROS length:", centros.length);

    console.log("Fetching Haberes Stats...");
    const haberes = await service.getHaberesStats([5, 6]);
    console.log("HABERES resumen length:", haberes.resumen.length);
  } catch (e) {
    console.error("ERROR IN SERVICE:", e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
