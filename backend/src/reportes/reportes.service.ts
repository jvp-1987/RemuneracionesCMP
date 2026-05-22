import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportesService {
  constructor(private readonly prisma: PrismaService) {}

  private async getLatestPeriod() {
    return this.prisma.periodo.findFirst({
      where: {
        liquidaciones: { some: {} }
      },
      orderBy: [
        { anio: 'desc' },
        { mes: 'desc' }
      ]
    });
  }

  async getHRStats() {
    const period = await this.getLatestPeriod();
    if (!period) return { headcount: 0, by_category: [], by_profesion: [], periodo: null };
    const periodId = period.id;

    const liquidaciones = await this.prisma.liquidacionMensual.findMany({
      where: { periodo_id: periodId },
      include: {
        funcionario: true
      }
    });

    const headcount = liquidaciones.length;
    
    // Dist by profesion
    const by_profesion = liquidaciones.reduce((acc, l) => {
      const prof = l.funcionario.profesion_enum || 'Sin Profesión';
      acc[prof] = (acc[prof] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Dist by category
    const by_category = liquidaciones.reduce((acc, l) => {
      const cat = l.funcionario.categoria_aps ? `Cat. ${l.funcionario.categoria_aps}` : 'S/C';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // format to arrays
    return {
      headcount,
      by_profesion: Object.entries(by_profesion).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      by_category: Object.entries(by_category).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    };
  }

  async getFinancialStats() {
    const period = await this.getLatestPeriod();
    if (!period) return { total_haberes: 0, total_descuentos: 0, total_liquido: 0, distribucion_gasto: [] };
    const periodId = period.id;

    const aggr = await this.prisma.liquidacionMensual.aggregate({
      where: { periodo_id: periodId },
      _sum: {
        sueldo_base: true,
        total_haberes: true,
        total_descuentos: true,
        monto_liquido: true,
        monto_he_pagado: true,
        monto_viaticos_real: true
      }
    });

    const total_sueldo_base = Number(aggr._sum.sueldo_base || 0);
    const total_haberes = Number(aggr._sum.total_haberes || 0);
    const total_descuentos = Number(aggr._sum.total_descuentos || 0);
    const total_liquido = Number(aggr._sum.monto_liquido || 0);
    const total_he = Number(aggr._sum.monto_he_pagado || 0);
    const total_viaticos = Number(aggr._sum.monto_viaticos_real || 0);

    // Variables = total_haberes - sueldo_base
    const haberes_variables = total_haberes - total_sueldo_base;
    let otros_haberes = haberes_variables - total_he - total_viaticos;
    if (otros_haberes < 0) otros_haberes = 0;

    return {
      total_haberes,
      total_descuentos,
      total_liquido,
      distribucion_gasto: [
        { name: 'Sueldo Base', value: total_sueldo_base },
        { name: 'Horas Extras', value: total_he },
        { name: 'Viáticos', value: total_viaticos },
        { name: 'Otros Haberes', value: otros_haberes }
      ].filter(item => item.value > 0).sort((a, b) => b.value - a.value)
    };
  }

  async getCentrosStats() {
    const period = await this.getLatestPeriod();
    if (!period) return [];
    const periodId = period.id;

    const liquidaciones = await this.prisma.liquidacionMensual.findMany({
      where: { periodo_id: periodId },
      include: {
        funcionario: {
          include: {
            centro_salud: true
          }
        }
      }
    });

    const centrosMap = liquidaciones.reduce((acc, l) => {
      const centro = l.funcionario.centro_salud;
      const centroId = centro?.id || 0;
      const centroName = centro?.nombre || 'Sin Establecimiento';

      if (!acc[centroId]) {
        acc[centroId] = { id: centroId, nombre: centroName, headcount: 0, costo_total: 0 };
      }
      
      acc[centroId].headcount += 1;
      acc[centroId].costo_total += Number(l.total_haberes || 0);
      return acc;
    }, {} as Record<number, any>);

    return Object.values(centrosMap).sort((a: any, b: any) => b.costo_total - a.costo_total);
  }
}
