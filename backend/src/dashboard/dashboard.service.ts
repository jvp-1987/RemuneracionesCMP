import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getProyecciones(year: number) {
    const periodos = await this.prisma.periodo.findMany({
      where: { anio: year, tipo: 'ORDINARIO' },
      orderBy: { mes: 'asc' }
    });

    const centros = await this.prisma.centroSalud.findMany({
      where: { parent_id: null }, // Top level centros, or we can just fetch all and aggregate
      select: { id: true, nombre: true }
    });

    // We will build a unified array of data per month
    const result = [];
    const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    for (const p of periodos) {
      const mesName = mesesNombres[p.mes - 1];

      // 1. Obtener liquidaciones del periodo (Maestro)
      const liquidaciones = await this.prisma.liquidacionMensual.findMany({
        where: { periodo_id: p.id },
        include: {
          funcionario: {
            include: { centro_salud: true }
          }
        }
      });

      // 2. Horas Extras por centro y total (Maestro: LiquidacionMensual.monto_he_pagado)
      const heByCentro: Record<string, number> = {};
      let totalHe = 0;
      for (const liq of liquidaciones) {
        const centroName = liq.funcionario?.centro_salud?.nombre || 'Sin Centro';
        const monto = Number(liq.monto_he_pagado || 0);
        heByCentro[centroName] = (heByCentro[centroName] || 0) + monto;
        totalHe += monto;
      }

      // 3. Sueldos por centro y total (Maestro: LiquidacionMensual.total_haberes)
      const sueldosByCentro: Record<string, number> = {};
      let totalSueldos = 0;
      for (const liq of liquidaciones) {
        const centroName = liq.funcionario?.centro_salud?.nombre || 'Sin Centro';
        const monto = Number(liq.total_haberes || 0);
        sueldosByCentro[centroName] = (sueldosByCentro[centroName] || 0) + monto;
        totalSueldos += monto;
      }

      // 3. Reemplazos por centro (Contratos activos en ese mes de tipo REEMPLAZO)
      // Definimos "activo en ese mes": fecha_inicio <= fin de mes y (fecha_termino >= inicio de mes o null)
      const startDate = new Date(year, p.mes - 1, 1);
      const endDate = new Date(year, p.mes, 0); // last day of month

      const reemplazosByCentro: Record<string, number> = {};
      const contratos = await this.prisma.contrato.findMany({
        where: {
          tipo_contrato: { contains: 'REEMPLAZO' },
          fecha_inicio: { lte: endDate },
          OR: [
            { fecha_termino: { gte: startDate } },
            { fecha_termino: null }
          ]
        },
        include: {
          funcionario: {
            include: { centro_salud: true }
          }
        }
      });
      let totalReemplazos = 0;
      for (const req of contratos) {
        const centroName = req.funcionario?.centro_salud?.nombre || 'Sin Centro';
        
        // Buscar liquidacion mensual del funcionario de reemplazo en este periodo
        const liq = await this.prisma.liquidacionMensual.findUnique({
          where: {
            funcionario_rut_periodo_id: {
              funcionario_rut: req.funcionario_rut,
              periodo_id: p.id
            }
          }
        });

        const costo = liq ? Number(liq.total_haberes || 0) : 0;
        reemplazosByCentro[centroName] = (reemplazosByCentro[centroName] || 0) + costo;
        totalReemplazos += costo;
      }

      result.push({
        name: mesName,
        mes: p.mes,
        anio: p.anio,
        horasExtrasTotal: totalHe,
        horasExtrasPorCentro: heByCentro,
        sueldosTotal: totalSueldos,
        sueldosPorCentro: sueldosByCentro,
        reemplazosTotal: totalReemplazos,
        reemplazosPorCentro: reemplazosByCentro
      });
    }

    return result;
  }
}
