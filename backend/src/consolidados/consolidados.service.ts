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

  findAll(user: any) {
    const isCentroSalud = user.rol_enum === 'CENTRO_SALUD';
    const where: any = {};
    if (isCentroSalud && user.centro_salud_id) {
      where.centro_salud_id = user.centro_salud_id;
    }

    return this.prisma.consolidado.findMany({
      where,
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

  async update(id: number, dto: UpdateConsolidadoDto, user: any) {
    const consolidado = await this.findOne(id);
    
    if (consolidado.periodo.estado === 'Cerrado') {
      throw new BadRequestException(`No se puede modificar un consolidado de un periodo CERRADO.`);
    }

    const updateData: any = {};

    // Logic for CONTROL role
    if (user.rol_enum === 'CONTROL' || user.rol_enum === 'ADMIN' || user.rol_enum === 'ADMIN_MAESTRO') {
      if (dto.vb_control_interno !== undefined) {
        updateData.vb_control_interno = dto.vb_control_interno;
        if (dto.vb_control_interno === true) {
          updateData.fecha_vb_control_interno = new Date();
          updateData.firma_vb_control_interno = `Validado por: ${user.nombre} (Control Interno)`;
        } else {
          updateData.fecha_vb_control_interno = null;
          updateData.firma_vb_control_interno = null;
        }
      }
    }

    // Logic for FINANZAS role
    if (user.rol_enum === 'FINANZAS' || user.rol_enum === 'ADMIN' || user.rol_enum === 'ADMIN_MAESTRO') {
      if (dto.vb_finanzas !== undefined) {
        updateData.vb_finanzas = dto.vb_finanzas;
        if (dto.vb_finanzas === true) {
          updateData.fecha_vb_finanzas = new Date();
          updateData.firma_vb_finanzas = `Validado por: ${user.nombre} (Finanzas)`;
        } else {
          updateData.fecha_vb_finanzas = null;
          updateData.firma_vb_finanzas = null;
        }
      }
    }

    // General updates (only for ADMIN)
    if (user.rol_enum === 'ADMIN' || user.rol_enum === 'ADMIN_MAESTRO') {
      if (dto.estado_actual_enum) updateData.estado_actual_enum = dto.estado_actual_enum;
      if (dto.usuario_gestor_id) updateData.usuario_gestor_id = dto.usuario_gestor_id;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No tienes permisos para actualizar estos campos o no se enviaron datos válidos.');
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

  async getDashboardKpis(user: any, periodoId?: number) {
    // ── Paso 1: Determinar el período a usar ───────────────────────────────────
    let targetPeriodoId = periodoId;

    if (!targetPeriodoId) {
      const ultimaLiq = await this.prisma.liquidacionMensual.findFirst({
        orderBy: { fecha_importacion: 'desc' },
        select: { periodo_id: true },
      });
      targetPeriodoId = ultimaLiq?.periodo_id ?? undefined;
    }

    // ── Paso 2: Determinar filtros de Rol ──────────────────────────────────────
    const isCentroSalud = user.rol_enum === 'CENTRO_SALUD';
    const centroId = user.centro_salud_id;

    const whereMaestro: any = targetPeriodoId ? { periodo_id: targetPeriodoId } : {};
    const whereConsolidado: any = {};

    if (isCentroSalud && centroId) {
      whereMaestro.funcionario = { centro_salud_id: centroId };
      whereConsolidado.centro_salud_id = centroId;
    }

    // ── Paso 3: Agregar totales desde el Maestro de Remuneraciones ─────────────
    const [totalesMaestro, porCentroRaw, cantidades, ultimosConsolidados, periodoActual] = await Promise.all([
      // KPIs financieros principales desde el maestro
      this.prisma.liquidacionMensual.aggregate({
        where: whereMaestro,
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
      // Si es un centro específico, agrupamos por funcionario para ver el detalle de ese centro
      // pero para el gráfico de barras del dashboard general, mantenemos la lógica de centro
      this.prisma.liquidacionMensual.findMany({
        where: whereMaestro,
        include: { funcionario: { include: { centro_salud: true } } },
      }),

      // Contadores operativos
      this.prisma.liquidacionMensual.aggregate({
        where: whereMaestro,
        _sum: {
          minutos_atraso_real: true,
        },
        _count: { funcionario_rut: true },
      }),

      // Últimos 5 consolidados (filtrados por centro si aplica)
      this.prisma.consolidado.findMany({
        where: whereConsolidado,
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
    const centroMap: Record<string, { nombre: string; gasto_total: number }> = {};
    for (const fRow of porCentroRaw) {
      const centrNombre = fRow.funcionario?.centro_salud?.nombre ?? 'Sin Centro';
      if (!centroMap[centrNombre]) centroMap[centrNombre] = { nombre: centrNombre, gasto_total: 0 };
      centroMap[centrNombre].gasto_total += Number(fRow.monto_liquido ?? 0);
    }
    const porCentro = Object.values(centroMap).sort((a, b) => b.gasto_total - a.gasto_total);

    // ── Paso 4: Lógica Híbrida ────────────────────────────────────────────────
    // Si el maestro está vacío (0.0), buscamos en el módulo de Novedades (Consolidados)
    let kpis: any = {
      total_sueldo_base: Number(totalesMaestro._sum.sueldo_base ?? 0),
      total_haberes: Number(totalesMaestro._sum.total_haberes ?? 0),
      total_descuentos: Number(totalesMaestro._sum.total_descuentos ?? 0),
      total_liquido: Number(totalesMaestro._sum.monto_liquido ?? 0),
      cantidad_funcionarios: totalesMaestro._count.funcionario_rut,
      total_he: Number(totalesMaestro._sum.monto_he_pagado ?? 0),
      cantidad_he_25: Number(totalesMaestro._sum.cantidad_he_25_real ?? 0),
      cantidad_he_50: Number(totalesMaestro._sum.cantidad_he_50_real ?? 0),
      total_viaticos: Number(totalesMaestro._sum.monto_viaticos_real ?? 0),
      total_atrasos_descuento: Number(totalesMaestro._sum.monto_atrasos_pagado ?? 0),
      minutos_atraso_total: Number(cantidades._sum.minutos_atraso_real ?? 0),
      total_turnos: 0,
    };

    let fuente = 'maestro_remuneraciones';

    // Si no hay datos en el maestro para el periodo seleccionado, consultamos Novedades
    if (kpis.total_haberes === 0 && targetPeriodoId) {
      fuente = 'novedades_en_proceso';
      
      const consolidadoId = ultimosConsolidados.find(c => c.periodo_id === targetPeriodoId)?.id;
      
      if (consolidadoId) {
        const [he, viat, atrasos] = await Promise.all([
          this.prisma.horasExtras.aggregate({
            where: { consolidado_id: consolidadoId },
            _sum: { cantidad_25: true, cantidad_50: true, monto_25: true, monto_50: true }
          }),
          this.prisma.viaticos.aggregate({
            where: { consolidado_id: consolidadoId },
            _sum: { monto_calculado: true }
          }),
          this.prisma.atrasos.aggregate({
            where: { consolidado_id: consolidadoId },
            _sum: { minutos: true, monto_descuento: true }
          })
        ]);

        kpis = {
          ...kpis,
          total_he: Number(he._sum.monto_25 ?? 0) + Number(he._sum.monto_50 ?? 0),
          cantidad_he_25: Number(he._sum.cantidad_25 ?? 0),
          cantidad_he_50: Number(he._sum.cantidad_50 ?? 0),
          total_viaticos: Number(viat._sum.monto_calculado ?? 0),
          total_atrasos_descuento: Number(atrasos._sum.monto_descuento ?? 0),
          minutos_atraso_total: Number(atrasos._sum.minutos ?? 0),
          cantidad_funcionarios: await this.prisma.funcionario.count({ where: { centro_salud_id: user.centro_salud_id } }),
        };
      }
    }

    return {
      periodo: periodoActual,
      fuente,
      kpis,
      por_centro: porCentro,
      ultimos_consolidados: ultimosConsolidados,
    };
  }
}
