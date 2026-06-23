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

  private async getPeriodsFilter(periodoIds?: number[]) {
    if (periodoIds && periodoIds.length > 0) {
      return { in: periodoIds };
    }
    const latest = await this.getLatestPeriod();
    return latest ? latest.id : 0;
  }

  async getHRStats(periodoIds?: number[]) {
    const periodFilter = await this.getPeriodsFilter(periodoIds);
    if (!periodFilter || periodFilter === 0) return { headcount: 0, by_category: [], by_profesion: [], periodo: null };

    const liquidaciones = await this.prisma.liquidacionMensual.findMany({
      where: { periodo_id: periodFilter },
      select: {
        funcionario_rut: true,
        detalle_json: true,
        funcionario: {
          select: {
            rut: true,
            nombre_completo: true,
            profesion_enum: true,
            categoria_aps: true,
            contratos: {
              select: {
                tipo_contrato: true
              }
            }
          }
        }
      }
    });

    const distinctFuncionariosMap = new Map();
    liquidaciones.forEach(l => {
      if (!distinctFuncionariosMap.has(l.funcionario_rut)) {
        distinctFuncionariosMap.set(l.funcionario_rut, {
          ...l.funcionario,
          latest_detalle_json: l.detalle_json,
          liquidaciones: [{ detalle_json: l.detalle_json }]
        });
      }
    });

    const uniqueFuncionarios = Array.from(distinctFuncionariosMap.values());
    const headcount = uniqueFuncionarios.length;
    
    // Dist by profesion
    const by_profesion = uniqueFuncionarios.reduce((acc, f: any) => {
      const prof = f.profesion_enum || 'Sin Profesión';
      acc[prof] = (acc[prof] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Dist by category
    const by_category = uniqueFuncionarios.reduce((acc, f: any) => {
      const cat = f.categoria_aps ? `Cat. ${f.categoria_aps}` : 'S/C';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Dist by contrato
    const by_contrato = uniqueFuncionarios.reduce((acc, f: any) => {
      let contratoKey: string | undefined;
      let matchedDetalle: any = {};

      if (f.liquidaciones) {
        for (const liq of f.liquidaciones) {
          const detalle = liq.detalle_json || {};
          
          contratoKey = Object.keys(detalle).find(k => k.toUpperCase().includes('TIPO CONTRATO EN PERSONAL'));
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

          if (contratoKey) {
            matchedDetalle = detalle;
            break;
          }
        }
      }
      
      let tipo = 'Sin Contrato';
      if (contratoKey && matchedDetalle[contratoKey]) {
        tipo = String(matchedDetalle[contratoKey]).trim().toUpperCase();
        if (tipo === 'CONTRATA') tipo = 'PLAZO FIJO';
        if (tipo === 'PLANTA') tipo = 'INDEFINIDO';
      } else {
        const activeContrato = f.contratos && f.contratos.length > 0 ? f.contratos[0] : null;
        if (activeContrato) {
          tipo = activeContrato.tipo_contrato;
          if (tipo === 'CONTRATA') tipo = 'PLAZO FIJO';
          if (tipo === 'PLANTA') tipo = 'INDEFINIDO';
        }
      }
      
      acc[tipo] = (acc[tipo] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // format to arrays
    return {
      headcount,
      by_profesion: Object.entries(by_profesion).map(([name, value]) => ({ name, value })).sort((a: any, b: any) => b.value - a.value),
      by_category: Object.entries(by_category).map(([name, value]) => ({ name, value })).sort((a: any, b: any) => b.value - a.value),
      by_contrato: Object.entries(by_contrato).map(([name, value]) => ({ name, value })).sort((a: any, b: any) => b.value - a.value),
      periodo: null,
    };
  }

  async getFinancialStats(periodoIds?: number[]) {
    const periodFilter = await this.getPeriodsFilter(periodoIds);
    if (!periodFilter || periodFilter === 0) return { total_haberes: 0, total_descuentos: 0, total_liquido: 0, distribucion_gasto: [] };

    const aggr = await this.prisma.liquidacionMensual.aggregate({
      where: { periodo_id: periodFilter },
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

  async getCentrosStats(periodoIds?: number[]) {
    const periodFilter = await this.getPeriodsFilter(periodoIds);
    if (!periodFilter || periodFilter === 0) return [];

    const liquidaciones = await this.prisma.liquidacionMensual.findMany({
      where: { periodo_id: periodFilter },
      select: {
        funcionario_rut: true,
        total_haberes: true,
        funcionario: {
          select: {
            centro_salud: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        }
      }
    });

    const uniqueByCentro = new Map();

    const centrosMap = liquidaciones.reduce((acc, l) => {
      const centro = l.funcionario.centro_salud;
      const centroId = centro?.id || 0;
      const centroName = centro?.nombre || 'Sin Establecimiento';

      if (!acc[centroId]) {
        acc[centroId] = { id: centroId, nombre: centroName, headcount: 0, costo_total: 0 };
        uniqueByCentro.set(centroId, new Set());
      }
      
      const rutSet = uniqueByCentro.get(centroId);
      if (!rutSet.has(l.funcionario_rut)) {
        rutSet.add(l.funcionario_rut);
        acc[centroId].headcount += 1;
      }

      acc[centroId].costo_total += Number(l.total_haberes || 0);
      return acc;
    }, {} as Record<number, any>);

    return Object.values(centrosMap).sort((a: any, b: any) => b.costo_total - a.costo_total);
  }

  async getHaberesStats(periodoIds?: number[]) {
    const periodFilter = await this.getPeriodsFilter(periodoIds);
    if (!periodFilter || periodFilter === 0) return { resumen: [], detalle: [] };

    const liquidaciones = await this.prisma.liquidacionMensual.findMany({
      where: { periodo_id: periodFilter },
      select: {
        funcionario_rut: true,
        detalle_json: true,
        funcionario: {
          select: {
            nombre_completo: true,
            centro_salud: {
              select: {
                nombre: true
              }
            }
          }
        }
      }
    });

    const haberesTarget = [
      "ASIG. ZONA",
      "DESEMPEÑO DIFICIL",
      "HORAS EXTRAS 25%",
      "HORAS EXTRAS 50%",
      "ASIG.FAMILIAR RETRO.MATERNAL",
      "ASIG.RESPONSABILIDAD",
      "11-VIATICOS",
      "127-DIF.BONO SALA CUNA Y MOVILIZACION",
      "140-ENCARGADO/A  CALIDAD",
      "152-COORDINACION UAPO",
      "166-ENCARGADO/A DE SECTOR",
      "173-BONO MEDICINA FAMILIAR",
      "181-ART.45-MUNICIPAL",
      "183-ART.45-MUNICIPAL VIVIENDA",
      "21-ASIGNACION DE CAJA",
      "212-BONO SALA CUNA Y MOVILIZACIÓN",
      "222-ENCARGADO COMUNAL INFORMATICA",
      "223-ENCARGADO PROGRAMA ODONTOL.COMUNAL",
      "227-COORDINADOR SAR",
      "230-HORAS EXTRAS 50% SUR",
      "232-TURNO SUR",
      "25-ASIGNACION RESP. DIRECTIVA",
      "26-JEFATURA ADMINISTRATIVA",
      "27-JEFATURA DE PROGRAMA",
      "29-EXT.HORARIA PROGRAMA APS",
      "33-JEFATURA SOME",
      "73-BONIF.CONDUCTORES LEY N*20157",
      "78-ASIGNACION MUNICIPAL FIJO",
      "98-RESPONSABILIDAD DIRECTIVA"
    ];

    const resumenMap = new Map<string, { total_monto: number; total_funcionarios: number }>();
    haberesTarget.forEach(h => resumenMap.set(h, { total_monto: 0, total_funcionarios: 0 }));

    const detalle = liquidaciones.map(l => {
      const funcDetalle = l.detalle_json as any;
      const haberesFunc: Record<string, number> = {};
      let total_funcionario = 0;

      haberesTarget.forEach(h => {
        const val = Number(funcDetalle[h]);
        if (!isNaN(val) && val > 0) {
          haberesFunc[h] = val;
          total_funcionario += val;
          const stat = resumenMap.get(h)!;
          stat.total_monto += val;
          stat.total_funcionarios += 1;
        }
      });

      return {
        rut: l.funcionario_rut,
        nombre: l.funcionario.nombre_completo,
        establecimiento: l.funcionario.centro_salud?.nombre || 'Sin Establecimiento',
        haberes: haberesFunc,
        total_haberes_seleccionados: total_funcionario
      };
    }).filter(d => d.total_haberes_seleccionados > 0);

    const resumen = Array.from(resumenMap.entries())
      .map(([nombre_haber, stats]) => ({
        nombre_haber,
        ...stats
      }))
      .filter(r => r.total_monto > 0)
      .sort((a, b) => b.total_monto - a.total_monto);

    return { resumen, detalle };
  }
}
