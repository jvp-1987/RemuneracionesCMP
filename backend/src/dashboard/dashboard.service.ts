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

      // 1. Horas Extras por centro en este periodo
      const heByCentro: Record<string, number> = {};
      const consolidadosHE = await this.prisma.consolidado.findMany({
        where: { periodo_id: p.id },
        include: {
          centro_salud: true,
          horas_extras: {
            where: {
              OR: [
                { estado_25: 'APROBADO' },
                { estado_50: 'APROBADO' }
              ]
            }
          }
        }
      });
      let totalHe = 0;
      for (const c of consolidadosHE) {
        let sumCentro = 0;
        for (const he of c.horas_extras) {
          if (he.estado_25 === 'APROBADO') sumCentro += Number(he.monto_25 || 0);
          if (he.estado_50 === 'APROBADO') sumCentro += Number(he.monto_50 || 0);
        }
        heByCentro[c.centro_salud.nombre] = (heByCentro[c.centro_salud.nombre] || 0) + sumCentro;
        totalHe += sumCentro;
      }

      // 2. Sueldos por centro en este periodo
      const sueldosByCentro: Record<string, number> = {};
      const liquidaciones = await this.prisma.liquidacionMensual.findMany({
        where: { periodo_id: p.id },
        include: {
          funcionario: {
            include: { centro_salud: true }
          }
        }
      });
      let totalSueldos = 0;
      for (const liq of liquidaciones) {
        const centroName = liq.funcionario?.centro_salud?.nombre || 'Sin Centro';
        const monto = Number(liq.total_haberes || 0); // O monto_liquido según definición
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
        reemplazosByCentro[centroName] = (reemplazosByCentro[centroName] || 0) + 1;
        totalReemplazos++;
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
