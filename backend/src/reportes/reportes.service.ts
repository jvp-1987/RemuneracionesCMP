import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportesService {
  constructor(private readonly prisma: PrismaService) {}

  async getGlobalStats() {
    const [
      totalHE,
      totalViaticos,
      totalTurnos,
      totalProcedimientos,
      consolidadosStatus,
    ] = await Promise.all([
      this.prisma.horasExtras.aggregate({
        _sum: { monto_25: true, monto_50: true },
      }),
      this.prisma.viaticos.aggregate({
        _sum: { monto_calculado: true },
      }),
      this.prisma.turnosUrgencia.aggregate({
        _sum: { monto_calculado: true },
      }),
      this.prisma.procedimientos.aggregate({
        _sum: { monto_calculado: true },
      }),
      this.prisma.consolidado.findMany({
        select: {
          vb_control_interno: true,
          vb_finanzas: true,
        },
      }),
    ]);

    const totalMoney = 
      Number(totalHE._sum.monto_25 || 0) + 
      Number(totalHE._sum.monto_50 || 0) + 
      Number(totalViaticos._sum.monto_calculado || 0) + 
      Number(totalTurnos._sum.monto_calculado || 0) + 
      Number(totalProcedimientos._sum.monto_calculado || 0);

    const totalConsolidados = consolidadosStatus.length;
    const certControlInterno = consolidadosStatus.filter(c => c.vb_control_interno).length;
    const certFinanzas = consolidadosStatus.filter(c => c.vb_finanzas).length;

    return {
      total_monto: totalMoney,
      total_unidades: totalConsolidados,
      certificacion_ci: totalConsolidados > 0 ? (certControlInterno / totalConsolidados) * 100 : 0,
      certificacion_fi: totalConsolidados > 0 ? (certFinanzas / totalConsolidados) * 100 : 0,
      distribucion_gasto: [
        { name: 'Horas Extras', value: Number(totalHE._sum.monto_25 || 0) + Number(totalHE._sum.monto_50 || 0) },
        { name: 'Viáticos', value: Number(totalViaticos._sum.monto_calculado || 0) },
        { name: 'Turnos Urgencia', value: Number(totalTurnos._sum.monto_calculado || 0) },
        { name: 'Procedimientos', value: Number(totalProcedimientos._sum.monto_calculado || 0) },
      ]
    };
  }

  async getStatsByCentro() {
    const centros = await this.prisma.centroSalud.findMany({
      include: {
        consolidados: {
          include: {
            horas_extras: true,
            viaticos: true,
          }
        }
      }
    });

    return centros.map(centro => {
      let montoTotal = 0;
      centro.consolidados.forEach(c => {
        c.horas_extras.forEach(h => montoTotal += Number(h.monto_25) + Number(h.monto_50));
        c.viaticos.forEach(v => montoTotal += Number(v.monto_calculado));
      });

      const certificados = centro.consolidados.filter(c => c.vb_control_interno && c.vb_finanzas).length;
      const total = centro.consolidados.length;

      return {
        id: centro.id,
        nombre: centro.nombre,
        monto: montoTotal,
        porcentaje_completado: total > 0 ? (certificados / total) * 100 : 0,
      };
    });
  }
}
