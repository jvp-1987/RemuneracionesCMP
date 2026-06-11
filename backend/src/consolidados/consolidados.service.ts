import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConsolidadoDto } from './dto/create-consolidado.dto';
import { UpdateConsolidadoDto } from './dto/update-consolidado.dto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';

@Injectable()
export class ConsolidadosService {
  private s3: S3Client;

  constructor(private readonly prisma: PrismaService) {
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT_URL || '',
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
      },
    });
  }

  create(dto: CreateConsolidadoDto) {
    return this.prisma.consolidado.create({ data: dto });
  }

  private async getCenterIds(centerId: number): Promise<number[]> {
    const center = await this.prisma.centroSalud.findUnique({
      where: { id: centerId },
      include: { dependientes: true }
    });
    if (!center) return [centerId];
    return [centerId, ...center.dependientes.map(d => d.id)];
  }

  async findAll(user: any, centroId?: number) {
    const isCentroSalud = ['CENTRO_SALUD', 'SECRETARIA'].includes(user.rol_enum);
    const where: any = {};
    
    // Explicit filter from query param
    if (centroId) {
      const ids = await this.getCenterIds(centroId);
      where.centro_salud_id = { in: ids };
    } 
    // Or implicit filter from user profile (if gestor de centro)
    else if (isCentroSalud && user.centro_salud_id) {
      const ids = await this.getCenterIds(user.centro_salud_id);
      where.centro_salud_id = { in: ids };
    }

    return this.prisma.consolidado.findMany({
      where,
      include: { centro_salud: true, periodo: true, usuario_gestor: true },
    });
  }

  async findOne(id: number, user?: any) {
    const consolidado = await this.prisma.consolidado.findUnique({
      where: { id },
      include: {
        centro_salud: true,
        periodo: true,
        usuario_gestor: true,
        horas_extras: { include: { funcionario: { include: { centro_salud: true } }, programa: true } },
        turnos_urgencia: { include: { funcionario: { include: { centro_salud: true } } } },
        viaticos: { include: { funcionario: { include: { centro_salud: true } } } },
        atrasos: { include: { funcionario: { include: { centro_salud: true } } } },
        procedimientos: { include: { funcionario: { include: { centro_salud: true } } } },
      },
    });

    if (!consolidado) throw new NotFoundException(`Consolidado #${id} no encontrado`);

    // Security check
    if (user && ['CENTRO_SALUD', 'SECRETARIA'].includes(user.rol_enum) && user.centro_salud_id && consolidado.centro_salud_id !== user.centro_salud_id) {
      throw new NotFoundException(`Consolidado #${id} no pertenece a su establecimiento`);
    }

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
        turnos_urgencia: true,
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
      prevConsolidado.turnos_urgencia?.forEach(t => {
        if (!comparativa[t.funcionario_rut]) comparativa[t.funcionario_rut] = {};
        comparativa[t.funcionario_rut].turno_monto_prev = Number(t.monto_calculado);
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
    const consolidado: any = await this.findOne(id, user);
    
    if (consolidado.periodo.estado === 'Cerrado') {
      throw new BadRequestException(`No se puede modificar un consolidado de un periodo CERRADO.`);
    }
    
    // Bloqueo de seguridad: El Gestor de Centro no puede alterar el consolidado si Control ya lo validó
    if (['CENTRO_SALUD', 'SECRETARIA'].includes(user.rol_enum) && consolidado.vb_control_interno) {
      throw new ForbiddenException('Edición bloqueada: El consolidado ya está validado por Control Interno y no puede ser alterado por el Centro de Salud.');
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

    // General updates
    if (user.rol_enum === 'ADMIN' || user.rol_enum === 'ADMIN_MAESTRO' || ['CENTRO_SALUD', 'SECRETARIA'].includes(user.rol_enum)) {
      if (dto.estado_actual_enum) updateData.estado_actual_enum = dto.estado_actual_enum;
      if ((user.rol_enum === 'ADMIN' || user.rol_enum === 'ADMIN_MAESTRO') && dto.usuario_gestor_id) {
        updateData.usuario_gestor_id = dto.usuario_gestor_id;
      }
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
    
    const extension = file.originalname.split('.').pop();
    const uniqueName = `respaldos/consolidados/${id}/${crypto.randomUUID()}.${extension}`;
    
    await this.s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || '',
      Key: uniqueName,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));
    
    return this.prisma.consolidado.update({
      where: { id },
      data: { url_respaldo: uniqueName }
    });
  }

  async uploadRecordRespaldo(consolidadoId: number, type: string, recordId: number, file: any) {
    if (!file) throw new BadRequestException('Archivo no proporcionado');
    
    const extension = file.originalname.split('.').pop();
    const uniqueName = `respaldos/records/${type}/${recordId}/${crypto.randomUUID()}.${extension}`;
    
    await this.s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || '',
      Key: uniqueName,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));

    let model: any;
    switch (type) {
      case 'horas': model = this.prisma.horasExtras; break;
      case 'viaticos': model = this.prisma.viaticos; break;
      case 'atrasos': model = this.prisma.atrasos; break;
      case 'procedimientos': model = this.prisma.procedimientos; break;
      case 'turnos': model = this.prisma.turnosUrgencia; break;
      default: throw new BadRequestException(`Tipo de registro '${type}' no válido`);
    }

    return model.update({
      where: { id: recordId },
      data: { url_respaldo: uniqueName }
    });
  }

  async getPresignedUrl(key: string) {
    if (!key) throw new BadRequestException('Se requiere una clave (Key) del archivo');
    // Si la ruta sigue siendo Base64 por retrocompatibilidad, la devolvemos directamente
    if (key.startsWith('data:')) {
      return { url: key };
    }
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME || '',
      Key: key,
    });
    // URL válida por 1 hora
    const url = await getSignedUrl(this.s3, command, { expiresIn: 3600 });
    return { url };
  }

  async getDashboardKpis(user: any, periodoId?: number, requestedFuente?: string, centroIdOverride?: number) {
    // ── Paso 1: Determinar el período a usar ───────────────────────────────────
    let targetPeriodoId = periodoId;

    if (!targetPeriodoId) {
      const ultimaLiq = await this.prisma.liquidacionMensual.findFirst({
        orderBy: { fecha_importacion: 'desc' },
        select: { periodo_id: true },
      });
      targetPeriodoId = ultimaLiq?.periodo_id ?? undefined;
    }

    // ── Paso 2: Determinar filtros de Rol & Centro ────────────────────────────
    const isCentroSalud = ['CENTRO_SALUD', 'SECRETARIA'].includes(user.rol_enum);
    const effectiveCentroId = centroIdOverride || (isCentroSalud ? user.centro_salud_id : null);
    
    const whereMaestro: any = targetPeriodoId ? { periodo_id: targetPeriodoId } : {};
    const whereConsolidado: any = targetPeriodoId ? { periodo_id: targetPeriodoId } : {};
    const whereHeViat: any = {};

    if (effectiveCentroId) {
      const ids = await this.getCenterIds(effectiveCentroId);
      whereMaestro.funcionario = { centro_salud_id: { in: ids } };
      whereConsolidado.centro_salud_id = { in: ids };
      whereHeViat.consolidado = { centro_salud_id: { in: ids } };
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
      total_he_25: 0,
      total_he_50: 0,
      cantidad_he_25: Number(totalesMaestro._sum.cantidad_he_25_real ?? 0),
      cantidad_he_50: Number(totalesMaestro._sum.cantidad_he_50_real ?? 0),
      total_viaticos: Number(totalesMaestro._sum.monto_viaticos_real ?? 0),
      total_atrasos_descuento: Number(totalesMaestro._sum.monto_atrasos_pagado ?? 0),
      minutos_atraso_total: Number(cantidades._sum.minutos_atraso_real ?? 0),
      total_turnos: 0,
    };

    let fuente = 'maestro_remuneraciones';

    // Determinar si forzamos una fuente o usamos la lógica híbrida
    const useNovedades = requestedFuente === 'novedades_en_proceso' || 
                        (requestedFuente !== 'maestro_remuneraciones' && kpis.total_haberes === 0 && targetPeriodoId);

    if (useNovedades && targetPeriodoId) {
      fuente = 'novedades_en_proceso';
      
      const matchingConsolidados = await this.prisma.consolidado.findMany({
        where: whereConsolidado,
        select: { id: true }
      });
      const consolidadoIds = matchingConsolidados.map(c => c.id);
      
      if (consolidadoIds.length > 0) {
        // Query approved/validated hours extras
        const allHe = await this.prisma.horasExtras.findMany({
          where: { consolidado_id: { in: consolidadoIds } }
        });
        
        let totalMontoHe = 0;
        let totalMontoHe25 = 0;
        let totalMontoHe50 = 0;
        let totalCant25 = 0;
        let totalCant50 = 0;
        const uniqueFuns = new Set<string>();
        
        for (const item of allHe) {
          if (item.estado_25 === 'APROBADO') {
            totalMontoHe += Number(item.monto_25 ?? 0);
            totalMontoHe25 += Number(item.monto_25 ?? 0);
            totalCant25 += Number(item.cantidad_25 ?? 0);
            uniqueFuns.add(item.funcionario_rut);
          }
          if (item.estado_50 === 'APROBADO') {
            totalMontoHe += Number(item.monto_50 ?? 0);
            totalMontoHe50 += Number(item.monto_50 ?? 0);
            totalCant50 += Number(item.cantidad_50 ?? 0);
            uniqueFuns.add(item.funcionario_rut);
          }
        }
        
        // Query approved/validated viaticos
        const viat = await this.prisma.viaticos.aggregate({
          where: { 
            consolidado_id: { in: consolidadoIds },
            estado: 'APROBADO'
          },
          _sum: { monto_calculado: true, rendicion_pasajes: true }
        });
        const totalViaticosVal = Number(viat._sum.monto_calculado ?? 0) + Number(viat._sum.rendicion_pasajes ?? 0);
        
        const approvedViaticos = await this.prisma.viaticos.findMany({
          where: { consolidado_id: { in: consolidadoIds }, estado: 'APROBADO' },
          select: { funcionario_rut: true }
        });
        approvedViaticos.forEach(v => uniqueFuns.add(v.funcionario_rut));

        // Query approved/validated atrasos
        const atrasosVal = await this.prisma.atrasos.aggregate({
          where: { 
            consolidado_id: { in: consolidadoIds },
            estado: 'APROBADO'
          },
          _sum: { minutos: true, monto_descuento: true }
        });
        
        const approvedAtrasos = await this.prisma.atrasos.findMany({
          where: { consolidado_id: { in: consolidadoIds }, estado: 'APROBADO' },
          select: { funcionario_rut: true }
        });
        approvedAtrasos.forEach(a => uniqueFuns.add(a.funcionario_rut));

        // Query approved/validated turnos
        const turnosVal = await this.prisma.turnosUrgencia.aggregate({
          where: { 
            consolidado_id: { in: consolidadoIds },
            estado: 'APROBADO'
          },
          _sum: { monto_calculado: true }
        });
        
        const approvedTurnos = await this.prisma.turnosUrgencia.findMany({
          where: { consolidado_id: { in: consolidadoIds }, estado: 'APROBADO' },
          select: { funcionario_rut: true }
        });
        approvedTurnos.forEach(t => uniqueFuns.add(t.funcionario_rut));

        kpis = {
          ...kpis,
          total_he: totalMontoHe,
          total_he_25: totalMontoHe25,
          total_he_50: totalMontoHe50,
          cantidad_he_25: totalCant25,
          cantidad_he_50: totalCant50,
          total_viaticos: totalViaticosVal,
          total_atrasos_descuento: Number(atrasosVal._sum.monto_descuento ?? 0),
          minutos_atraso_total: Number(atrasosVal._sum.minutos ?? 0),
          cantidad_funcionarios: uniqueFuns.size,
          total_turnos: Number(turnosVal._sum.monto_calculado ?? 0),
        };
      } else {
        kpis = {
          ...kpis,
          total_he: 0,
          total_he_25: 0,
          total_he_50: 0,
          cantidad_he_25: 0,
          cantidad_he_50: 0,
          total_viaticos: 0,
          total_atrasos_descuento: 0,
          minutos_atraso_total: 0,
          cantidad_funcionarios: 0,
          total_turnos: 0,
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

  async exportExcel(id: number, user: any): Promise<Buffer> {
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

    // Security check
    if (user && ['CENTRO_SALUD', 'SECRETARIA'].includes(user.rol_enum) && user.centro_salud_id && consolidado.centro_salud_id !== user.centro_salud_id) {
      throw new ForbiddenException(`No tiene acceso a este consolidado`);
    }

    const xlsx = require('xlsx');
    const wb = xlsx.utils.book_new();

    // 1. Sheet Resumen
    const resumenData = [
      { Campo: 'Establecimiento / CESFAM', Valor: consolidado.centro_salud.nombre },
      { Campo: 'Período', Valor: `${consolidado.periodo.mes}/${consolidado.periodo.anio}` },
      { Campo: 'Estado actual', Valor: consolidado.estado_actual_enum },
      { Campo: 'V°B° Control Interno', Valor: consolidado.vb_control_interno ? 'Sí' : 'No' },
      { Campo: 'Fecha V°B° Control Interno', Valor: consolidado.fecha_vb_control_interno ? consolidado.fecha_vb_control_interno.toISOString() : 'N/A' },
      { Campo: 'Firma V°B° Control Interno', Valor: consolidado.firma_vb_control_interno || 'N/A' },
      { Campo: 'V°B° Finanzas', Valor: consolidado.vb_finanzas ? 'Sí' : 'No' },
      { Campo: 'Fecha V°B° Finanzas', Valor: consolidado.fecha_vb_finanzas ? consolidado.fecha_vb_finanzas.toISOString() : 'N/A' },
      { Campo: 'Firma V°B° Finanzas', Valor: consolidado.firma_vb_finanzas || 'N/A' },
      { Campo: 'Usuario Gestor', Valor: consolidado.usuario_gestor?.nombre || 'Sincronización Automática' },
      { Campo: 'Fecha Exportación', Valor: new Date().toISOString() },
    ];
    const wsResumen = xlsx.utils.json_to_sheet(resumenData);
    xlsx.utils.book_append_sheet(wb, wsResumen, 'Resumen');

    // 2. Sheet Horas Extras
    const heData = consolidado.horas_extras.map(he => ({
      RUT: he.funcionario.rut,
      Nombre: he.funcionario.nombre_completo,
      Programa: he.programa.nombre,
      'Cantidad 25%': Number(he.cantidad_25),
      'Monto 25%': Number(he.monto_25),
      'Estado 25%': he.estado_25,
      'Observaciones 25%': he.observaciones_25 || '',
      'Cantidad 50%': Number(he.cantidad_50),
      'Monto 50%': Number(he.monto_50),
      'Estado 50%': he.estado_50,
      'Observaciones 50%': he.observaciones_50 || '',
    }));
    const wsHE = xlsx.utils.json_to_sheet(heData);
    xlsx.utils.book_append_sheet(wb, wsHE, 'Horas Extras');

    // 3. Sheet Viáticos
    const viaticosData = consolidado.viaticos.map(v => ({
      RUT: v.funcionario.rut,
      Nombre: v.funcionario.nombre_completo,
      Destino: v.tipo_destino,
      Justificacion: v.justificacion || '',
      Concepto: v.concepto || '',
      'Monto Calculado': Number(v.monto_calculado),
      'Rendicion Pasajes': Number(v.rendicion_pasajes),
      Estado: v.estado,
    }));
    const wsViaticos = xlsx.utils.json_to_sheet(viaticosData);
    xlsx.utils.book_append_sheet(wb, wsViaticos, 'Viáticos');

    // 4. Sheet Atrasos
    const atrasosData = consolidado.atrasos.map(a => ({
      RUT: a.funcionario.rut,
      Nombre: a.funcionario.nombre_completo,
      Minutos: a.minutos,
      'Tiempo Descuento': a.tiempo_descuento,
      'Monto Descuento': Number(a.monto_descuento),
      Estado: a.estado,
      Concepto: a.concepto || '',
    }));
    const wsAtrasos = xlsx.utils.json_to_sheet(atrasosData);
    xlsx.utils.book_append_sheet(wb, wsAtrasos, 'Atrasos');

    // 5. Sheet Procedimientos
    const procData = consolidado.procedimientos.map(p => ({
      RUT: p.funcionario.rut,
      Nombre: p.funcionario.nombre_completo,
      'Total Procedimientos': p.total_procedimientos,
      'Monto Calculado': Number(p.monto_calculado),
      Estado: p.estado,
    }));
    const wsProcedimientos = xlsx.utils.json_to_sheet(procData);
    xlsx.utils.book_append_sheet(wb, wsProcedimientos, 'Procedimientos');

    // 6. Sheet Turnos de Urgencia
    const turnosData = consolidado.turnos_urgencia.map(t => ({
      RUT: t.funcionario.rut,
      Nombre: t.funcionario.nombre_completo,
      'Cant. Turnos Hábiles': t.cant_turnos_habiles,
      'Cant. Turnos Inhábiles': t.cant_turnos_inhabiles,
      'Valor Hábil': Number(t.valor_habil || 0),
      'Valor Inhábil': Number(t.valor_inhabil || 0),
      'Monto Calculado': Number(t.monto_calculado),
      Estado: t.estado,
    }));
    const wsTurnos = xlsx.utils.json_to_sheet(turnosData);
    xlsx.utils.book_append_sheet(wb, wsTurnos, 'Turnos Urgencia');

    return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}

