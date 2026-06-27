import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  private getMainCentroName(centro: any): string {
    if (!centro) return 'Sin Centro';
    if (centro.parent) {
      return centro.parent.nombre.toUpperCase();
    }
    return centro.nombre.toUpperCase();
  }

  private getContratoTipo(liq: any): string {
    const detalle = liq.detalle_json;
    if (detalle && typeof detalle === 'object') {
      let contratoKey = Object.keys(detalle).find(k => k.toUpperCase().includes('TIPO CONTRATO EN PERSONAL'));
      if (!contratoKey) {
        contratoKey = Object.keys(detalle).find(k => {
          const key = k.toUpperCase();
          return key.includes('TIPO DE CONTRATO') || key.includes('CALIDAD JURIDICA');
        });
      }
      if (!contratoKey) {
        contratoKey = Object.keys(detalle).find(k => {
          const key = k.toUpperCase();
          return key.includes('CONTRATO') && !key.includes('FECHA') && !key.includes('Nº') && !key.includes('N°');
        });
      }
      if (contratoKey && (detalle as any)[contratoKey]) {
        return String((detalle as any)[contratoKey]).trim().toUpperCase();
      }
    }

    // Fallback a la tabla de contratos
    const activeContrato = liq.funcionario?.contratos && liq.funcionario.contratos.length > 0 
      ? liq.funcionario.contratos[0] 
      : null;
    if (activeContrato) {
      return String(activeContrato.tipo_contrato).trim().toUpperCase();
    }

    return 'SIN CONTRATO';
  }

  async getProyecciones(year: number) {
    const periodos = await this.prisma.periodo.findMany({
      where: { anio: year, tipo: 'ORDINARIO' },
      orderBy: { mes: 'asc' }
    });

    const result = [];
    const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    for (const p of periodos) {
      const mesName = mesesNombres[p.mes - 1];

      // 1. Obtener liquidaciones del periodo (Maestro) con jerarquía de centros
      const liquidaciones = await this.prisma.liquidacionMensual.findMany({
        where: { periodo_id: p.id },
        include: {
          funcionario: {
            include: {
              centro_salud: {
                include: {
                  parent: true
                }
              },
              contratos: true
            }
          }
        }
      });

      // 2. Horas Extras por centro y total (Maestro: LiquidacionMensual.monto_he_pagado)
      const heByCentro: Record<string, number> = {};
      let totalHe = 0;
      for (const liq of liquidaciones) {
        const mainCentroName = this.getMainCentroName(liq.funcionario?.centro_salud);
        const monto = Number(liq.monto_he_pagado || 0);
        heByCentro[mainCentroName] = (heByCentro[mainCentroName] || 0) + monto;
        totalHe += monto;
      }

      // 3. Sueldos por centro y total (Maestro: LiquidacionMensual.total_haberes)
      const sueldosByCentro: Record<string, number> = {};
      let totalSueldos = 0;
      for (const liq of liquidaciones) {
        const mainCentroName = this.getMainCentroName(liq.funcionario?.centro_salud);
        const monto = Number(liq.total_haberes || 0);
        sueldosByCentro[mainCentroName] = (sueldosByCentro[mainCentroName] || 0) + monto;
        totalSueldos += monto;
      }

      // 4. Reemplazos por centro y total (Maestro: LiquidacionMensual.total_haberes de reemplazos)
      const reemplazosByCentro: Record<string, number> = {};
      let totalReemplazos = 0;
      for (const liq of liquidaciones) {
        const tipoContrato = this.getContratoTipo(liq);
        if (tipoContrato.includes('REEMPLAZO')) {
          const mainCentroName = this.getMainCentroName(liq.funcionario?.centro_salud);
          const costo = Number(liq.total_haberes || 0);
          reemplazosByCentro[mainCentroName] = (reemplazosByCentro[mainCentroName] || 0) + costo;
          totalReemplazos += costo;
        }
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
