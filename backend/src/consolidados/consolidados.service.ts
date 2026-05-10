import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConsolidadoDto } from './dto/create-consolidado.dto';
import { UpdateConsolidadoDto } from './dto/update-consolidado.dto';

@Injectable()
export class ConsolidadosService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateConsolidadoDto) {
    return this.prisma.consolidado.create({ data: dto });
  }

  findAll() {
    return this.prisma.consolidado.findMany({
      include: { centro_salud: true, periodo: true, usuario_gestor: true },
    });
  }

  async findOne(id: number) {
    const consolidado = await this.prisma.consolidado.findUnique({
      where: { id },
      include: {
        centro_salud: true,
        periodo: true,
        usuario_gestor: true,
        horas_extras: { include: { funcionario: true, programa: true } },
        turnos_urgencia: { include: { funcionario: true } },
        viaticos: { include: { funcionario: true } },
        atrasos: { include: { funcionario: true } },
        procedimientos: { include: { funcionario: true } },
      },
    });

    if (!consolidado) throw new NotFoundException(`Consolidado #${id} no encontrado`);

    // --- Anomaly Detection: Find previous month data ---
    let prevMes = consolidado.periodo.mes - 1;
    let prevAnio = consolidado.periodo.anio;
    if (prevMes === 0) {
      prevMes = 12;
      prevAnio -= 1;
    }

    const prevPeriodo = await this.prisma.periodo.findFirst({
      where: { mes: prevMes, anio: prevAnio }
    });

    const prevConsolidado = prevPeriodo ? await this.prisma.consolidado.findFirst({
      where: {
        centro_salud_id: consolidado.centro_salud_id,
        periodo_id: prevPeriodo.id,
      },
      include: {
        horas_extras: true,
        viaticos: true,
        atrasos: true,
      },
    }) : null;

    // Aggregating historical data by RUT for the frontend
    const comparativa: Record<string, any> = {};
    if (prevConsolidado) {
      prevConsolidado.horas_extras.forEach(h => {
        if (!comparativa[h.funcionario_rut]) comparativa[h.funcionario_rut] = {};
        comparativa[h.funcionario_rut].cantidad_25_prev = Number(h.cantidad_25);
        comparativa[h.funcionario_rut].cantidad_50_prev = Number(h.cantidad_50);
      });
      prevConsolidado.viaticos.forEach(v => {
        if (!comparativa[v.funcionario_rut]) comparativa[v.funcionario_rut] = {};
        comparativa[v.funcionario_rut].viatico_monto_prev = Number(v.monto_calculado);
      });
      prevConsolidado.atrasos.forEach(a => {
        if (!comparativa[a.funcionario_rut]) comparativa[a.funcionario_rut] = {};
        comparativa[a.funcionario_rut].atraso_monto_prev = Number(a.monto_descuento);
      });
    }

    const escalas = await this.prisma.escalaHorasExtras.findMany({
      where: { anio: 2026 }
    });

    return {
      ...consolidado,
      comparativa,
      escalas,
    };
  }

  async update(id: number, dto: UpdateConsolidadoDto) {
    const consolidado = await this.findOne(id);
    
    if (consolidado.periodo.estado === 'Cerrado') {
      throw new BadRequestException(`No se puede modificar un consolidado de un periodo CERRADO.`);
    }

    // Auto-fill certification metadata if V°B° is being changed to true
    const updateData: any = { ...dto };
    
    if (dto.vb_control_interno === true) {
      updateData.fecha_vb_control_interno = new Date();
      updateData.firma_vb_control_interno = 'Dpto. Auditoría Interna - Panguipulli';
    } else if (dto.vb_control_interno === false) {
      updateData.fecha_vb_control_interno = null;
      updateData.firma_vb_control_interno = null;
    }

    if (dto.vb_finanzas === true) {
      updateData.fecha_vb_finanzas = new Date();
      updateData.firma_vb_finanzas = 'Dirección de Finanzas - Salud APS';
    } else if (dto.vb_finanzas === false) {
      updateData.fecha_vb_finanzas = null;
      updateData.firma_vb_finanzas = null;
    }

    return this.prisma.consolidado.update({ 
      where: { id }, 
      data: updateData 
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.consolidado.delete({ where: { id } });
  }

  async uploadRespaldo(id: number, file: any) {
    if (!file) throw new BadRequestException('Archivo no proporcionado');
    
    // Convertir a base64 para persistencia simple sin S3
    const base64 = file.buffer.toString('base64');
    const dataUri = `data:${file.mimetype};base64,${base64}`;
    
    return this.prisma.consolidado.update({
      where: { id },
      data: { url_respaldo: dataUri }
    });
  }

  async getDashboardKpis(periodoId?: number) {
    // ── Paso 1: Determinar el período a usar ───────────────────────────────────
    // Si se pasa un periodoId, se filtra por ese. Si no, se usa el más reciente
    // que tenga al menos una liquidación cargada.
    let targetPeriodoId = periodoId;

    if (!targetPeriodoId) {
      const ultimaLiq = await this.prisma.liquidacionMensual.findFirst({
        orderBy: { fecha_importacion: 'desc' },
        select: { periodo_id: true },
      });
      targetPeriodoId = ultimaLiq?.periodo_id ?? undefined;
    }

    // ── Paso 2: Agregar totales desde el Maestro de Remuneraciones ─────────────
    // LiquidacionMensual es la fuente de verdad financiera mensual.
    const whereClause = targetPeriodoId ? { periodo_id: targetPeriodoId } : {};

    const [totalesMaestro, porCentroRaw, cantidades, ultimosConsolidados, periodoActual] = await Promise.all([
      // KPIs financieros principales desde el maestro
      this.prisma.liquidacionMensual.aggregate({
        where: whereClause,
        _sum: {
          sueldo_base: true,
          total_haberes: true,
          total_descuentos: true,
          monto_liquido: true,
          monto_he_pagado: true,
          monto_atrasos_pagado: true,
          monto_viaticos_real: true,
          cantidad_he_25_real: true,
          cantidad_he_50_real: true,
        },
        _count: { funcionario_rut: true },
      }),

      // Gasto total por Centro de Salud desde el maestro
      this.prisma.liquidacionMensual.groupBy({
        by: ['funcionario_rut'],
        where: whereClause,
        _sum: {
          total_haberes: true,
          monto_liquido: true,
        },
      }),

      // Contadores operativos (atrasos, viáticos registrados en maestro)
      this.prisma.liquidacionMensual.aggregate({
        where: whereClause,
        _sum: {
          minutos_atraso_real: true,
        },
        _count: { funcionario_rut: true },
      }),

      // Últimos 5 consolidados (sólo para contexto operativo del proceso de validación)
      this.prisma.consolidado.findMany({
        include: { periodo: true, centro_salud: true },
        orderBy: { id: 'desc' },
        take: 5,
      }),

      // Info del período actual
      targetPeriodoId
        ? this.prisma.periodo.findUnique({ where: { id: targetPeriodoId } })
        : null,
    ]);

    // ── Paso 3: Construir gasto por centro ────────────────────────────────────
    // Necesitamos cruzar funcionario_rut con su centro_salud para agrupar
    const rutsList = porCentroRaw.map(r => r.funcionario_rut);
    const funcionariosCentro = await this.prisma.funcionario.findMany({
      where: { rut: { in: rutsList } },
      select: { rut: true, centro_salud_id: true, centro_salud: { select: { nombre: true } } },
    });

    const centroMap: Record<string, { nombre: string; gasto_total: number }> = {};
    for (const fRow of porCentroRaw) {
      const func = funcionariosCentro.find(f => f.rut === fRow.funcionario_rut);
      const centrNombre = func?.centro_salud?.nombre ?? 'Sin Centro';
      if (!centroMap[centrNombre]) centroMap[centrNombre] = { nombre: centrNombre, gasto_total: 0 };
      centroMap[centrNombre].gasto_total += Number(fRow._sum.monto_liquido ?? 0);
    }
    const porCentro = Object.values(centroMap).sort((a, b) => b.gasto_total - a.gasto_total);

    // ── Paso 4: Retornar KPIs desde el Maestro ────────────────────────────────
    return {
      periodo: periodoActual,
      fuente: 'maestro_remuneraciones', // Flag para indicar origen de datos
      kpis: {
        // Masa salarial real del maestro
        total_sueldo_base: Number(totalesMaestro._sum.sueldo_base ?? 0),
        total_haberes: Number(totalesMaestro._sum.total_haberes ?? 0),
        total_descuentos: Number(totalesMaestro._sum.total_descuentos ?? 0),
        total_liquido: Number(totalesMaestro._sum.monto_liquido ?? 0),
        cantidad_funcionarios: totalesMaestro._count.funcionario_rut,

        // Haberes extras (reales según maestro)
        total_he: Number(totalesMaestro._sum.monto_he_pagado ?? 0),
        cantidad_he_25: Number(totalesMaestro._sum.cantidad_he_25_real ?? 0),
        cantidad_he_50: Number(totalesMaestro._sum.cantidad_he_50_real ?? 0),

        // Viáticos reales
        total_viaticos: Number(totalesMaestro._sum.monto_viaticos_real ?? 0),
        cantidad_viaticos: 0, // Se puede cruzar con Viaticos si se requiere conteo exacto

        // Descuentos por atrasos reales
        total_atrasos_descuento: Number(totalesMaestro._sum.monto_atrasos_pagado ?? 0),
        minutos_atraso_total: Number(cantidades._sum.minutos_atraso_real ?? 0),
        cantidad_atrasos: 0, // Se puede cruzar con Atrasos si se requiere conteo exacto

        // Legacy (por compatibilidad con frontend mientras se migra)
        total_turnos: 0,
        cantidad_turnos_habiles: 0,
        cantidad_turnos_inhabiles: 0,
      },
      por_centro: porCentro,
      ultimos_consolidados: ultimosConsolidados,
    };
  }
}
