import { PrismaClient } from '@prisma/client';
import { ReportesService } from './src/reportes/reportes.service';

const prisma = new PrismaClient();
const service = new ReportesService(prisma as any);

async function run() {
  const hrStats = await service.getHRStats([3]); // Marzo
  const financialStats = await service.getFinancialStats([3]);
  const centros = await service.getCentrosStats([3]);
  const haberes = await service.getHaberesStats([3]);
  const haberesResumen = haberes.resumen;
  const haberesDetalle = haberes.detalle;

  // Let's simulate the render logic step by step to catch any throw
  try {
    const r1 = (hrStats?.headcount || 0).toLocaleString('es-CL');
    const r2 = (hrStats?.by_profesion || []).slice(0, 3).map((prof:any) => prof.name);
    const r3 = (financialStats?.total_haberes || 0).toLocaleString('es-CL');
    const r4 = (financialStats?.total_liquido || 0).toLocaleString('es-CL');
    const r5 = (((financialStats?.total_liquido || 0) / (financialStats?.total_haberes || 1)) * 100).toFixed(1);
    
    centros.map((centro:any) => {
      const x = centro.costo_total.toLocaleString('es-CL');
      const y = (centro.costo_total / (financialStats?.total_haberes || 1)) * 100;
    });

    (financialStats?.distribucion_gasto || []).map((item:any, idx:number) => {
      const total = financialStats?.total_haberes || 1;
      const percentage = (item.value / total) * 100;
      let offset = 0;
      for (let i = 0; i < idx; i++) {
        offset += ((financialStats?.distribucion_gasto[i].value || 0) / total) * 100;
      }
    });

    const v1 = financialStats?.distribucion_gasto && financialStats.distribucion_gasto[0] ? `${((financialStats.distribucion_gasto[0].value / (financialStats.total_haberes || 1)) * 100).toFixed(1)}%` : '0%';

    hrStats?.by_contrato?.map((item:any) => {
      const total = hrStats.headcount || 1;
      const percentage = (item.value / total) * 100;
      const p = percentage.toFixed(1);
    });

    haberesResumen.map((h:any) => {
      const a = h.total.toLocaleString('es-CL');
      const b = (h.total / (haberesResumen[0]?.total || 1)) * 100;
    });

    const selectedHaber = haberesResumen.length > 0 ? haberesResumen[0].nombre : null;
    
    if (selectedHaber) {
      haberesDetalle
        .filter((d:any) => d.haberes[selectedHaber])
        .sort((a:any, b:any) => b.haberes[selectedHaber] - a.haberes[selectedHaber])
        .map((d:any) => {
          const c = d.haberes[selectedHaber].toLocaleString('es-CL');
        });
    }

    console.log("NO CRASH IN RENDERING MOCK!");
  } catch(e) {
    console.error("CRASH FOUND:", e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
