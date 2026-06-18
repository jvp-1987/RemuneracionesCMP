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

  async clearTestData() {
    await this.prisma.turnosUrgencia.deleteMany();
    await this.prisma.procedimientos.deleteMany();
    await this.prisma.atrasos.deleteMany();
    await this.prisma.viaticos.deleteMany();
    await this.prisma.horasExtras.deleteMany();
    await this.prisma.consolidado.deleteMany();
    return { success: true, message: 'Datos de prueba eliminados exitosamente.' };
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
        turnos_urgencia: { include: { funcionario: { include: { centro_salud: true } }, programa: true } },
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
      where: { mes: prevMes, anio: prevAnio, tipo: 'ORDINARIO' }
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
    
    try {
      await this.s3.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME || '',
        Key: uniqueName,
        Body: file.buffer,
        ContentType: file.mimetype,
      }));
      
      try {
        return await this.prisma.consolidado.update({
          where: { id },
          data: { url_respaldo: uniqueName }
        });
      } catch (dbError: any) {
        console.error(`[ConsolidadosService] Error al guardar la ruta de R2 en consolidado: ${dbError.message}`);
        throw new BadRequestException('Error en la base de datos al guardar la referencia del consolidado. Verifica el esquema en producción.');
      }
    } catch (s3Error: any) {
      console.warn(`[ConsolidadosService] Error al subir a R2, usando fallback a Base64: ${s3Error.message}`);
      const base64Str = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      
      try {
        return await this.prisma.consolidado.update({
          where: { id },
          data: { url_respaldo: base64Str }
        });
      } catch (dbError: any) {
        console.error(`[ConsolidadosService] Error al guardar Base64 en consolidado: ${dbError.message}`);
        throw new BadRequestException(
          `La base de datos rechazó el almacenamiento del archivo del consolidado. ` +
          `Esto ocurre si el archivo es demasiado grande (límite max_allowed_packet excedido) o si el esquema de la base de datos no está sincronizado en producción.`
        );
      }
    }
  }

  async uploadRecordRespaldo(consolidadoId: number, type: string, recordId: number, file: any) {
    if (!file) throw new BadRequestException('Archivo no proporcionado');
    
    const extension = file.originalname.split('.').pop();
    const uniqueName = `respaldos/records/${type}/${recordId}/${crypto.randomUUID()}.${extension}`;
    
    let model: any;
    switch (type) {
      case 'horas': model = this.prisma.horasExtras; break;
      case 'viaticos': model = this.prisma.viaticos; break;
      case 'atrasos': model = this.prisma.atrasos; break;
      case 'procedimientos': model = this.prisma.procedimientos; break;
      case 'turnos': model = this.prisma.turnosUrgencia; break;
      default: throw new BadRequestException(`Tipo de registro '${type}' no válido`);
    }

    try {
      await this.s3.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME || '',
        Key: uniqueName,
        Body: file.buffer,
        ContentType: file.mimetype,
      }));

      try {
        return await model.update({
          where: { id: recordId },
          data: { url_respaldo: uniqueName }
        });
      } catch (dbError: any) {
        console.error(`[ConsolidadosService] Error al guardar la ruta de R2 en la base de datos: ${dbError.message}`);
        throw new BadRequestException('Error en la base de datos al guardar la referencia. Verifica si el esquema de la base de datos está actualizado en producción.');
      }
    } catch (s3Error: any) {
      console.warn(`[ConsolidadosService] Error al subir respaldo de registro a R2, usando fallback a Base64: ${s3Error.message}`);
      const base64Str = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      
      try {
        return await model.update({
          where: { id: recordId },
          data: { url_respaldo: base64Str }
        });
      } catch (dbError: any) {
        console.error(`[ConsolidadosService] Error al guardar Base64 en la base de datos: ${dbError.message}`);
        throw new BadRequestException(
          `La base de datos rechazó el almacenamiento del archivo. ` +
          `Esto ocurre si el archivo es demasiado grande (límite max_allowed_packet excedido) o si el esquema de la base de datos no está sincronizado en producción.`
        );
      }
    }
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
        turnos_urgencia: { include: { funcionario: true, programa: true } },
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

    // --- 1. Calcular Totales para Tabla Resumen Financiero ---
    let heAprobado = 0;
    let hePendiente = 0;
    let heRechazado = 0;
    for (const he of consolidado.horas_extras) {
      if (he.estado_25 === 'APROBADO') heAprobado += Number(he.monto_25 || 0);
      else if (he.estado_25 === 'PENDIENTE') hePendiente += Number(he.monto_25 || 0);
      else if (he.estado_25 === 'RECHAZADO') heRechazado += Number(he.monto_25 || 0);

      if (he.estado_50 === 'APROBADO') heAprobado += Number(he.monto_50 || 0);
      else if (he.estado_50 === 'PENDIENTE') hePendiente += Number(he.monto_50 || 0);
      else if (he.estado_50 === 'RECHAZADO') heRechazado += Number(he.monto_50 || 0);
    }

    let turnosAprobado = 0;
    let turnosPendiente = 0;
    let turnosRechazado = 0;
    for (const t of consolidado.turnos_urgencia) {
      if (t.estado === 'APROBADO') turnosAprobado += Number(t.monto_calculado || 0);
      else if (t.estado === 'PENDIENTE') turnosPendiente += Number(t.monto_calculado || 0);
      else if (t.estado === 'RECHAZADO') turnosRechazado += Number(t.monto_calculado || 0);
    }

    let viaticosAprobado = 0;
    let viaticosPendiente = 0;
    let viaticosRechazado = 0;
    for (const v of consolidado.viaticos) {
      const total = Number(v.monto_calculado || 0) + Number(v.rendicion_pasajes || 0);
      if (v.estado === 'APROBADO') viaticosAprobado += total;
      else if (v.estado === 'PENDIENTE') viaticosPendiente += total;
      else if (v.estado === 'RECHAZADO') viaticosRechazado += total;
    }

    let atrasosAprobado = 0;
    let atrasosPendiente = 0;
    let atrasosRechazado = 0;
    for (const a of consolidado.atrasos) {
      if (a.estado === 'APROBADO') atrasosAprobado += Number(a.monto_descuento || 0);
      else if (a.estado === 'PENDIENTE') atrasosPendiente += Number(a.monto_descuento || 0);
      else if (a.estado === 'RECHAZADO') atrasosRechazado += Number(a.monto_descuento || 0);
    }

    let procsAprobado = 0;
    let procsPendiente = 0;
    let procsRechazado = 0;
    for (const p of consolidado.procedimientos) {
      if (p.estado === 'APROBADO') procsAprobado += Number(p.monto_calculado || 0);
      else if (p.estado === 'PENDIENTE') procsPendiente += Number(p.monto_calculado || 0);
      else if (p.estado === 'RECHAZADO') procsRechazado += Number(p.monto_calculado || 0);
    }

    // Helper formatters
    const formatDate = (date: Date | null | undefined): string => {
      if (!date) return 'N/A';
      const d = new Date(date);
      if (isNaN(d.getTime())) return 'N/A';
      const pad = (num: number) => String(num).padStart(2, '0');
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    };

    const formatDateTime = (date: Date | null | undefined): string => {
      if (!date) return 'N/A';
      const d = new Date(date);
      if (isNaN(d.getTime())) return 'N/A';
      const pad = (num: number) => String(num).padStart(2, '0');
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const resumenFinanciero = [
      { Sección: 'Horas Extras (25% + 50%)', Aprobado: heAprobado, Pendiente: hePendiente, Rechazado: heRechazado, Total: heAprobado + hePendiente + heRechazado },
      { Sección: 'Turnos de Urgencia', Aprobado: turnosAprobado, Pendiente: turnosPendiente, Rechazado: turnosRechazado, Total: turnosAprobado + turnosPendiente + turnosRechazado },
      { Sección: 'Viáticos y Pasajes', Aprobado: viaticosAprobado, Pendiente: viaticosPendiente, Rechazado: viaticosRechazado, Total: viaticosAprobado + viaticosPendiente + viaticosRechazado },
      { Sección: 'Procedimientos APS', Aprobado: procsAprobado, Pendiente: procsPendiente, Rechazado: procsRechazado, Total: procsAprobado + procsPendiente + procsRechazado },
      { Sección: 'Descuento Atrasos (-)', Aprobado: -atrasosAprobado, Pendiente: -atrasosPendiente, Rechazado: -atrasosRechazado, Total: -(atrasosAprobado + atrasosPendiente + atrasosRechazado) },
      {
        Sección: 'TOTAL NETO CONSOLIDADO',
        Aprobado: heAprobado + turnosAprobado + viaticosAprobado + procsAprobado - atrasosAprobado,
        Pendiente: hePendiente + turnosPendiente + viaticosPendiente + procsPendiente - atrasosPendiente,
        Rechazado: heRechazado + turnosRechazado + viaticosRechazado + procsRechazado - atrasosRechazado,
        Total: (heAprobado + turnosAprobado + viaticosAprobado + procsAprobado - atrasosAprobado) +
               (hePendiente + turnosPendiente + viaticosPendiente + procsPendiente - atrasosPendiente) +
               (heRechazado + turnosRechazado + viaticosRechazado + procsRechazado - atrasosRechazado)
      }
    ];

    const aoaResumen: any[][] = [];
    aoaResumen.push(['=== REPORTE CONSOLIDADO DE REMUNERACIONES APS ===', '']);
    aoaResumen.push(['Establecimiento / CESFAM', consolidado.centro_salud.nombre]);
    aoaResumen.push(['Período', `${consolidado.periodo.mes}/${consolidado.periodo.anio}`]);
    aoaResumen.push(['Estado Actual', consolidado.estado_actual_enum]);
    aoaResumen.push(['', '']);
    
    aoaResumen.push(['=== CONTROL DE FIRMAS Y VISTOS BUENOS ===', '']);
    aoaResumen.push(['V°B° Control Interno', consolidado.vb_control_interno ? 'Sí' : 'No']);
    aoaResumen.push(['Fecha V°B° Control Interno', consolidado.fecha_vb_control_interno ? formatDateTime(consolidado.fecha_vb_control_interno) : 'Pendiente']);
    aoaResumen.push(['Firma Electrónica Control', consolidado.firma_vb_control_interno || 'N/A']);
    aoaResumen.push(['V°B° Finanzas', consolidado.vb_finanzas ? 'Sí' : 'No']);
    aoaResumen.push(['Fecha V°B° Finanzas', consolidado.fecha_vb_finanzas ? formatDateTime(consolidado.fecha_vb_finanzas) : 'Pendiente']);
    aoaResumen.push(['Firma Electrónica Finanzas', consolidado.firma_vb_finanzas || 'N/A']);
    aoaResumen.push(['Gestor del Consolidado', consolidado.usuario_gestor?.nombre || 'Sincronización Automática']);
    aoaResumen.push(['Fecha de Exportación', formatDateTime(new Date())]);
    aoaResumen.push(['', '']);
    
    aoaResumen.push(['=== RESUMEN FINANCIERO MENSUAL (PROYECTADO) ===', '', '', '', '']);
    aoaResumen.push(['CONCEPTO / SECCIÓN', 'APROBADO', 'PENDIENTE', 'RECHAZADO', 'TOTAL PROYECTADO']);
    for (const row of resumenFinanciero) {
      aoaResumen.push([row.Sección, row.Aprobado, row.Pendiente, row.Rechazado, row.Total]);
    }

    const wsResumen = xlsx.utils.aoa_to_sheet(aoaResumen);

    // Formatear columnas B, C, D, E de la tabla financiera (filas 18 a 23 en Excel)
    for (let r = 18; r <= 23; r++) {
      for (const col of ['B', 'C', 'D', 'E']) {
        const cellRef = `${col}${r}`;
        if (wsResumen[cellRef] !== undefined) {
          wsResumen[cellRef].t = 'n';
          wsResumen[cellRef].z = '$#,##0;($#,##0);"-"';
        }
      }
    }

    wsResumen['!cols'] = [
      { wch: 45 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
    ];
    xlsx.utils.book_append_sheet(wb, wsResumen, 'Resumen');

    // --- Función Helper para Generar Hojas con Filtros, Totales Dinámicos (SUBTOTAL) y Formatos ---
    const createDetailSheet = (
      sheetName: string,
      headers: string[],
      rows: any[],
      numericCols: { index: number; isCurrency?: boolean }[],
      totalCols: { index: number; isCurrency?: boolean }[]
    ) => {
      const aoa: any[][] = [];
      aoa.push([`=== DETALLE DE ${sheetName.toUpperCase()} ===`, '']);
      aoa.push([`Establecimiento: ${consolidado.centro_salud.nombre} | Período: ${consolidado.periodo.mes}/${consolidado.periodo.anio}`, '']);
      aoa.push(['', '']);
      aoa.push(headers); // Fila 4 (índice 3 en AOA)

      const N = rows.length;
      if (N > 0) {
        for (const r of rows) {
          const rowArr = headers.map(h => r[h]);
          aoa.push(rowArr);
        }
        const totalRow: any[] = Array(headers.length).fill(null);
        totalRow[0] = 'TOTAL FILTRADO';
        aoa.push(totalRow);
      } else {
        const emptyRow: any[] = Array(headers.length).fill(null);
        emptyRow[0] = '(Sin registros para este establecimiento en el período)';
        aoa.push(emptyRow);
      }

      const ws = xlsx.utils.aoa_to_sheet(aoa);

      if (N > 0) {
        const dataStartRow = 5;
        const dataEndRow = 5 + N - 1;
        const totalRowIndex = 5 + N;

        // Formatear filas de datos
        for (let r = dataStartRow; r <= dataEndRow; r++) {
          for (const col of numericCols) {
            const colLetter = xlsx.utils.encode_col(col.index);
            const cellRef = `${colLetter}${r}`;
            if (ws[cellRef] !== undefined) {
              ws[cellRef].t = 'n';
              if (col.isCurrency) {
                ws[cellRef].z = '$#,##0;($#,##0);"-"';
              }
            }
          }
        }

        // Agregar fórmulas SUBTOTAL
        for (const col of totalCols) {
          const colLetter = xlsx.utils.encode_col(col.index);
          const cellRef = `${colLetter}${totalRowIndex}`;
          ws[cellRef] = {
            t: 'n',
            f: `SUBTOTAL(9,${colLetter}${dataStartRow}:${colLetter}${dataEndRow})`,
            z: col.isCurrency ? '$#,##0;($#,##0);"-"' : undefined
          };
        }

        // Habilitar Autofilter en Excel (en la fila de headers, que es la fila 4)
        const lastColLetter = xlsx.utils.encode_col(headers.length - 1);
        ws['!autofilter'] = { ref: `A4:${lastColLetter}${dataEndRow}` };
      }

      // Autoajustar anchos de columna
      const colWidths = headers.map((header, colIdx) => {
        let maxLen = header.length;
        for (let r = 0; r < aoa.length; r++) {
          // Omitir las primeras tres filas de títulos en el cálculo de anchos
          if (r < 3) continue;
          const val = aoa[r][colIdx];
          if (val !== null && val !== undefined) {
            let valStr = String(val);
            const isCurrCol = numericCols.some(c => c.index === colIdx && c.isCurrency);
            if (isCurrCol) valStr = '$' + valStr + '.000';
            if (valStr.length > maxLen) {
              maxLen = valStr.length;
            }
          }
        }
        return { wch: Math.max(maxLen + 4, 12) };
      });
      ws['!cols'] = colWidths;

      xlsx.utils.book_append_sheet(wb, ws, sheetName);
    };

    // 2. Sheet Horas Extras (Ordenado por Nombre)
    const sortedHe = [...consolidado.horas_extras].sort((a, b) =>
      (a.funcionario?.nombre_completo || '').localeCompare(b.funcionario?.nombre_completo || '')
    );
    const heData = sortedHe.map(he => ({
      RUT: he.funcionario.rut,
      NOMBRE: he.funcionario.nombre_completo,
      PROGRAMA: he.programa.nombre,
      'FECHA INICIO': formatDate(he.fecha_inicio),
      'FECHA TERMINO': formatDate(he.fecha_termino),
      'CANTIDAD 25%': Number(he.cantidad_25),
      'MONTO 25%': Number(he.monto_25),
      'ESTADO 25%': he.estado_25,
      'OBSERVACIONES 25%': he.observaciones_25 || '',
      'CANTIDAD 50%': Number(he.cantidad_50),
      'MONTO 50%': Number(he.monto_50),
      'ESTADO 50%': he.estado_50,
      'OBSERVACIONES 50%': he.observaciones_50 || '',
    }));
    createDetailSheet(
      'Horas Extras',
      ['RUT', 'NOMBRE', 'PROGRAMA', 'FECHA INICIO', 'FECHA TERMINO', 'CANTIDAD 25%', 'MONTO 25%', 'ESTADO 25%', 'OBSERVACIONES 25%', 'CANTIDAD 50%', 'MONTO 50%', 'ESTADO 50%', 'OBSERVACIONES 50%'],
      heData,
      [{ index: 5 }, { index: 6, isCurrency: true }, { index: 9 }, { index: 10, isCurrency: true }],
      [{ index: 5 }, { index: 6, isCurrency: true }, { index: 9 }, { index: 10, isCurrency: true }]
    );

    // 3. Sheet Viáticos (Ordenado por Nombre)
    const sortedViaticos = [...consolidado.viaticos].sort((a, b) =>
      (a.funcionario?.nombre_completo || '').localeCompare(b.funcionario?.nombre_completo || '')
    );
    const viaticosData = sortedViaticos.map(v => ({
      RUT: v.funcionario.rut,
      NOMBRE: v.funcionario.nombre_completo,
      DESTINO: v.tipo_destino,
      'FECHA INICIO': formatDate(v.fecha_inicio),
      'FECHA TERMINO': formatDate(v.fecha_termino),
      JUSTIFICACION: v.justificacion || '',
      CONCEPTO: v.concepto || '',
      'MONTO CALCULADO': Number(v.monto_calculado),
      'RENDICION PASAJES': Number(v.rendicion_pasajes),
      ESTADO: v.estado,
    }));
    createDetailSheet(
      'Viáticos',
      ['RUT', 'NOMBRE', 'DESTINO', 'FECHA INICIO', 'FECHA TERMINO', 'JUSTIFICACION', 'CONCEPTO', 'MONTO CALCULADO', 'RENDICION PASAJES', 'ESTADO'],
      viaticosData,
      [{ index: 7, isCurrency: true }, { index: 8, isCurrency: true }],
      [{ index: 7, isCurrency: true }, { index: 8, isCurrency: true }]
    );

    // 4. Sheet Atrasos (Ordenado por Nombre)
    const sortedAtrasos = [...consolidado.atrasos].sort((a, b) =>
      (a.funcionario?.nombre_completo || '').localeCompare(b.funcionario?.nombre_completo || '')
    );
    const atrasosData = sortedAtrasos.map(a => ({
      RUT: a.funcionario.rut,
      NOMBRE: a.funcionario.nombre_completo,
      'FECHA INICIO': formatDate(a.fecha_inicio),
      'FECHA TERMINO': formatDate(a.fecha_termino),
      MINUTOS: a.minutos,
      'TIEMPO DESCUENTO': a.tiempo_descuento,
      'MONTO DESCUENTO': Number(a.monto_descuento),
      ESTADO: a.estado,
      CONCEPTO: a.concepto || '',
    }));
    createDetailSheet(
      'Atrasos',
      ['RUT', 'NOMBRE', 'FECHA INICIO', 'FECHA TERMINO', 'MINUTOS', 'TIEMPO DESCUENTO', 'MONTO DESCUENTO', 'ESTADO', 'CONCEPTO'],
      atrasosData,
      [{ index: 4 }, { index: 6, isCurrency: true }],
      [{ index: 4 }, { index: 6, isCurrency: true }]
    );

    // 5. Sheet Procedimientos (Ordenado por Nombre)
    const sortedProcedimientos = [...consolidado.procedimientos].sort((a, b) =>
      (a.funcionario?.nombre_completo || '').localeCompare(b.funcionario?.nombre_completo || '')
    );
    const procData = sortedProcedimientos.map(p => ({
      RUT: p.funcionario.rut,
      NOMBRE: p.funcionario.nombre_completo,
      'FECHA INICIO': formatDate(p.fecha_inicio),
      'FECHA TERMINO': formatDate(p.fecha_termino),
      'TOTAL PROCEDIMIENTOS': p.total_procedimientos,
      'MONTO CALCULADO': Number(p.monto_calculado),
      ESTADO: p.estado,
    }));
    createDetailSheet(
      'Procedimientos',
      ['RUT', 'NOMBRE', 'FECHA INICIO', 'FECHA TERMINO', 'TOTAL PROCEDIMIENTOS', 'MONTO CALCULADO', 'ESTADO'],
      procData,
      [{ index: 4 }, { index: 5, isCurrency: true }],
      [{ index: 4 }, { index: 5, isCurrency: true }]
    );

    // 6. Sheet Turnos de Urgencia (Ordenado por Nombre)
    const sortedTurnos = [...consolidado.turnos_urgencia].sort((a, b) =>
      (a.funcionario?.nombre_completo || '').localeCompare(b.funcionario?.nombre_completo || '')
    );
    const turnosData = sortedTurnos.map(t => ({
      RUT: t.funcionario.rut,
      NOMBRE: t.funcionario.nombre_completo,
      PROGRAMA: t.programa?.nombre || 'PRESUPUESTARIO',
      'FECHA INICIO': formatDate(t.fecha_inicio),
      'FECHA TERMINO': formatDate(t.fecha_termino),
      'CANT. TURNOS HABILES': t.cant_turnos_habiles,
      'CANT. TURNOS INHABILES': t.cant_turnos_inhabiles,
      'VALOR HABIL': Number(t.valor_habil || 0),
      'VALOR INHABIL': Number(t.valor_inhabil || 0),
      'MONTO CALCULADO': Number(t.monto_calculado),
      ESTADO: t.estado,
    }));
    createDetailSheet(
      'Turnos Urgencia',
      ['RUT', 'NOMBRE', 'PROGRAMA', 'FECHA INICIO', 'FECHA TERMINO', 'CANT. TURNOS HABILES', 'CANT. TURNOS INHABILES', 'VALOR HABIL', 'VALOR INHABIL', 'MONTO CALCULADO', 'ESTADO'],
      turnosData,
      [{ index: 5 }, { index: 6 }, { index: 7, isCurrency: true }, { index: 8, isCurrency: true }, { index: 9, isCurrency: true }],
      [{ index: 5 }, { index: 6 }, { index: 9, isCurrency: true }]
    );

    return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  async fixAllTurnosPrograms() {
    const turnos = await this.prisma.turnosUrgencia.findMany({
      include: { funcionario: { include: { centro_salud: true } } }
    });

    let updatedCount = 0;
    for (const t of turnos) {
      const centroNombre = t.funcionario?.centro_salud?.nombre?.toUpperCase() || '';
      let progName = 'PROGRAMA DE TURNO';
      
      if (centroNombre.includes('LIQUIÑE')) {
        progName = 'PROG. SUR LIQUIÑE';
      } else if (centroNombre.includes('CHOSHUENCO')) {
        progName = 'PROG. SUR CHOSHUENCO';
      } else if (centroNombre.includes('NELTUME')) {
        progName = 'PROG. SUR NELTUME';
      } else if (centroNombre.includes('COÑARIPE')) {
        progName = 'PROG. SUR COÑARIPE';
      } else if (centroNombre.includes('SAR') || centroNombre.includes('PANGUIPULLI')) {
        progName = 'TURNO SAR';
      }

      let programa = await this.prisma.programa.findFirst({
        where: { nombre: progName }
      });
      if (!programa) {
        programa = await this.prisma.programa.create({
          data: {
            nombre: progName,
            categoria_enum: 'PROGRAMAS_TURNO'
          }
        });
      }

      await this.prisma.turnosUrgencia.update({
        where: { id: t.id },
        data: { programa_id: programa.id }
      });
      updatedCount++;
    }

    return { success: true, message: `Se actualizaron ${updatedCount} turnos con sus programas correspondientes.` };
  }

  async migrateBase64ToR2() {
    const stats = {
      configStatus: {
        R2_BUCKET_NAME: !!process.env.R2_BUCKET_NAME,
        R2_ENDPOINT_URL: !!process.env.R2_ENDPOINT_URL,
        R2_ACCESS_KEY_ID: !!process.env.R2_ACCESS_KEY_ID,
        R2_SECRET_ACCESS_KEY: !!process.env.R2_SECRET_ACCESS_KEY,
      },
      consolidado: { total: 0, migrated: 0, failed: 0 },
      horas: { total: 0, migrated: 0, failed: 0 },
      turnos: { total: 0, migrated: 0, failed: 0 },
      viaticos: { total: 0, migrated: 0, failed: 0 },
      atrasos: { total: 0, migrated: 0, failed: 0 },
      procedimientos: { total: 0, migrated: 0, failed: 0 },
      totalBytes: 0,
      errors: [] as string[]
    };

    // 1. Migrate Consolidado
    const consolidados = await this.prisma.consolidado.findMany({
      where: { url_respaldo: { startsWith: 'data:' } }
    });
    stats.consolidado.total = consolidados.length;
    for (const item of consolidados) {
      try {
        const parsed = this.parseBase64(item.url_respaldo!);
        if (parsed) {
          const extension = parsed.mimeType.split('/').pop() || 'pdf';
          const uniqueName = `respaldos/consolidados/${item.id}/${crypto.randomUUID()}.${extension}`;
          
          await this.s3.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME || '',
            Key: uniqueName,
            Body: parsed.buffer,
            ContentType: parsed.mimeType,
          }));

          await this.prisma.consolidado.update({
            where: { id: item.id },
            data: { url_respaldo: uniqueName }
          });
          stats.consolidado.migrated++;
          stats.totalBytes += parsed.buffer.length;
        } else {
          stats.consolidado.failed++;
          stats.errors.push(`Consolidado #${item.id}: Invalid base64 pattern`);
        }
      } catch (err: any) {
        stats.consolidado.failed++;
        stats.errors.push(`Consolidado #${item.id}: ${err.message}`);
      }
    }

    // 2. Migrate HorasExtras
    const horas = await this.prisma.horasExtras.findMany({
      where: { url_respaldo: { startsWith: 'data:' } }
    });
    stats.horas.total = horas.length;
    for (const item of horas) {
      try {
        const parsed = this.parseBase64(item.url_respaldo!);
        if (parsed) {
          const extension = parsed.mimeType.split('/').pop() || 'pdf';
          const uniqueName = `respaldos/records/horas/${item.id}/${crypto.randomUUID()}.${extension}`;
          
          await this.s3.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME || '',
            Key: uniqueName,
            Body: parsed.buffer,
            ContentType: parsed.mimeType,
          }));

          await this.prisma.horasExtras.update({
            where: { id: item.id },
            data: { url_respaldo: uniqueName }
          });
          stats.horas.migrated++;
          stats.totalBytes += parsed.buffer.length;
        } else {
          stats.horas.failed++;
          stats.errors.push(`HorasExtras #${item.id}: Invalid base64 pattern`);
        }
      } catch (err: any) {
        stats.horas.failed++;
        stats.errors.push(`HorasExtras #${item.id}: ${err.message}`);
      }
    }

    // 3. Migrate TurnosUrgencia
    const turnosList = await this.prisma.turnosUrgencia.findMany({
      where: { url_respaldo: { startsWith: 'data:' } }
    });
    stats.turnos.total = turnosList.length;
    for (const item of turnosList) {
      try {
        const parsed = this.parseBase64(item.url_respaldo!);
        if (parsed) {
          const extension = parsed.mimeType.split('/').pop() || 'pdf';
          const uniqueName = `respaldos/records/turnos/${item.id}/${crypto.randomUUID()}.${extension}`;
          
          await this.s3.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME || '',
            Key: uniqueName,
            Body: parsed.buffer,
            ContentType: parsed.mimeType,
          }));

          await this.prisma.turnosUrgencia.update({
            where: { id: item.id },
            data: { url_respaldo: uniqueName }
          });
          stats.turnos.migrated++;
          stats.totalBytes += parsed.buffer.length;
        } else {
          stats.turnos.failed++;
          stats.errors.push(`TurnosUrgencia #${item.id}: Invalid base64 pattern`);
        }
      } catch (err: any) {
        stats.turnos.failed++;
        stats.errors.push(`TurnosUrgencia #${item.id}: ${err.message}`);
      }
    }

    // 4. Migrate Viaticos
    const viaticosList = await this.prisma.viaticos.findMany({
      where: { url_respaldo: { startsWith: 'data:' } }
    });
    stats.viaticos.total = viaticosList.length;
    for (const item of viaticosList) {
      try {
        const parsed = this.parseBase64(item.url_respaldo!);
        if (parsed) {
          const extension = parsed.mimeType.split('/').pop() || 'pdf';
          const uniqueName = `respaldos/records/viaticos/${item.id}/${crypto.randomUUID()}.${extension}`;
          
          await this.s3.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME || '',
            Key: uniqueName,
            Body: parsed.buffer,
            ContentType: parsed.mimeType,
          }));

          await this.prisma.viaticos.update({
            where: { id: item.id },
            data: { url_respaldo: uniqueName }
          });
          stats.viaticos.migrated++;
          stats.totalBytes += parsed.buffer.length;
        } else {
          stats.viaticos.failed++;
          stats.errors.push(`Viaticos #${item.id}: Invalid base64 pattern`);
        }
      } catch (err: any) {
        stats.viaticos.failed++;
        stats.errors.push(`Viaticos #${item.id}: ${err.message}`);
      }
    }

    // 5. Migrate Atrasos
    const atrasosList = await this.prisma.atrasos.findMany({
      where: { url_respaldo: { startsWith: 'data:' } }
    });
    stats.atrasos.total = atrasosList.length;
    for (const item of atrasosList) {
      try {
        const parsed = this.parseBase64(item.url_respaldo!);
        if (parsed) {
          const extension = parsed.mimeType.split('/').pop() || 'pdf';
          const uniqueName = `respaldos/records/atrasos/${item.id}/${crypto.randomUUID()}.${extension}`;
          
          await this.s3.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME || '',
            Key: uniqueName,
            Body: parsed.buffer,
            ContentType: parsed.mimeType,
          }));

          await this.prisma.atrasos.update({
            where: { id: item.id },
            data: { url_respaldo: uniqueName }
          });
          stats.atrasos.migrated++;
          stats.totalBytes += parsed.buffer.length;
        } else {
          stats.atrasos.failed++;
          stats.errors.push(`Atrasos #${item.id}: Invalid base64 pattern`);
        }
      } catch (err: any) {
        stats.atrasos.failed++;
        stats.errors.push(`Atrasos #${item.id}: ${err.message}`);
      }
    }

    // 6. Migrate Procedimientos
    const procedimientosList = await this.prisma.procedimientos.findMany({
      where: { url_respaldo: { startsWith: 'data:' } }
    });
    stats.procedimientos.total = procedimientosList.length;
    for (const item of procedimientosList) {
      try {
        const parsed = this.parseBase64(item.url_respaldo!);
        if (parsed) {
          const extension = parsed.mimeType.split('/').pop() || 'pdf';
          const uniqueName = `respaldos/records/procedimientos/${item.id}/${crypto.randomUUID()}.${extension}`;
          
          await this.s3.send(new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME || '',
            Key: uniqueName,
            Body: parsed.buffer,
            ContentType: parsed.mimeType,
          }));

          await this.prisma.procedimientos.update({
            where: { id: item.id },
            data: { url_respaldo: uniqueName }
          });
          stats.procedimientos.migrated++;
          stats.totalBytes += parsed.buffer.length;
        } else {
          stats.procedimientos.failed++;
          stats.errors.push(`Procedimientos #${item.id}: Invalid base64 pattern`);
        }
      } catch (err: any) {
        stats.procedimientos.failed++;
        stats.errors.push(`Procedimientos #${item.id}: ${err.message}`);
      }
    }

    return stats;
  }

  async getMigrationStatus() {
    const base64Counts = {
      consolidado: await this.prisma.consolidado.count({ where: { url_respaldo: { startsWith: 'data:' } } }),
      horas: await this.prisma.horasExtras.count({ where: { url_respaldo: { startsWith: 'data:' } } }),
      turnos: await this.prisma.turnosUrgencia.count({ where: { url_respaldo: { startsWith: 'data:' } } }),
      viaticos: await this.prisma.viaticos.count({ where: { url_respaldo: { startsWith: 'data:' } } }),
      atrasos: await this.prisma.atrasos.count({ where: { url_respaldo: { startsWith: 'data:' } } }),
      procedimientos: await this.prisma.procedimientos.count({ where: { url_respaldo: { startsWith: 'data:' } } }),
    };

    const r2Counts = {
      consolidado: await this.prisma.consolidado.count({ where: { url_respaldo: { startsWith: 'respaldos/' } } }),
      horas: await this.prisma.horasExtras.count({ where: { url_respaldo: { startsWith: 'respaldos/' } } }),
      turnos: await this.prisma.turnosUrgencia.count({ where: { url_respaldo: { startsWith: 'respaldos/' } } }),
      viaticos: await this.prisma.viaticos.count({ where: { url_respaldo: { startsWith: 'respaldos/' } } }),
      atrasos: await this.prisma.atrasos.count({ where: { url_respaldo: { startsWith: 'respaldos/' } } }),
      procedimientos: await this.prisma.procedimientos.count({ where: { url_respaldo: { startsWith: 'respaldos/' } } }),
    };

    const configStatus = {
      R2_BUCKET_NAME: !!process.env.R2_BUCKET_NAME,
      R2_ENDPOINT_URL: !!process.env.R2_ENDPOINT_URL,
      R2_ACCESS_KEY_ID: !!process.env.R2_ACCESS_KEY_ID,
      R2_SECRET_ACCESS_KEY: !!process.env.R2_SECRET_ACCESS_KEY,
    };

    return { configStatus, base64Counts, r2Counts };
  }

  async revertMigration() {
    const stats = {
      consolidado: { total: 0, reverted: 0, failed: 0 },
      horas: { total: 0, reverted: 0, failed: 0 },
      turnos: { total: 0, reverted: 0, failed: 0 },
      viaticos: { total: 0, reverted: 0, failed: 0 },
      atrasos: { total: 0, reverted: 0, failed: 0 },
      procedimientos: { total: 0, reverted: 0, failed: 0 },
      totalBytes: 0,
      errors: [] as string[]
    };

    const revertRecord = async (key: string) => {
      const response = await this.s3.send(new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME || '',
        Key: key,
      }));
      const base64Body = await (response.Body as any).transformToString('base64');
      return `data:${response.ContentType || 'application/pdf'};base64,${base64Body}`;
    };

    // 1. Revert Consolidado
    const consolidados = await this.prisma.consolidado.findMany({
      where: { url_respaldo: { startsWith: 'respaldos/' } }
    });
    stats.consolidado.total = consolidados.length;
    for (const item of consolidados) {
      try {
        const base64Str = await revertRecord(item.url_respaldo!);
        await this.prisma.consolidado.update({
          where: { id: item.id },
          data: { url_respaldo: base64Str }
        });
        stats.consolidado.reverted++;
      } catch (err: any) {
        stats.consolidado.failed++;
        stats.errors.push(`Consolidado #${item.id}: ${err.message}`);
      }
    }

    // 2. Revert HorasExtras
    const horas = await this.prisma.horasExtras.findMany({
      where: { url_respaldo: { startsWith: 'respaldos/' } }
    });
    stats.horas.total = horas.length;
    for (const item of horas) {
      try {
        const base64Str = await revertRecord(item.url_respaldo!);
        await this.prisma.horasExtras.update({
          where: { id: item.id },
          data: { url_respaldo: base64Str }
        });
        stats.horas.reverted++;
      } catch (err: any) {
        stats.horas.failed++;
        stats.errors.push(`HorasExtras #${item.id}: ${err.message}`);
      }
    }

    // 3. Revert TurnosUrgencia
    const turnosList = await this.prisma.turnosUrgencia.findMany({
      where: { url_respaldo: { startsWith: 'respaldos/' } }
    });
    stats.turnos.total = turnosList.length;
    for (const item of turnosList) {
      try {
        const base64Str = await revertRecord(item.url_respaldo!);
        await this.prisma.turnosUrgencia.update({
          where: { id: item.id },
          data: { url_respaldo: base64Str }
        });
        stats.turnos.reverted++;
      } catch (err: any) {
        stats.turnos.failed++;
        stats.errors.push(`TurnosUrgencia #${item.id}: ${err.message}`);
      }
    }

    // 4. Revert Viaticos
    const viaticosList = await this.prisma.viaticos.findMany({
      where: { url_respaldo: { startsWith: 'respaldos/' } }
    });
    stats.viaticos.total = viaticosList.length;
    for (const item of viaticosList) {
      try {
        const base64Str = await revertRecord(item.url_respaldo!);
        await this.prisma.viaticos.update({
          where: { id: item.id },
          data: { url_respaldo: base64Str }
        });
        stats.viaticos.reverted++;
      } catch (err: any) {
        stats.viaticos.failed++;
        stats.errors.push(`Viaticos #${item.id}: ${err.message}`);
      }
    }

    // 5. Revert Atrasos
    const atrasosList = await this.prisma.atrasos.findMany({
      where: { url_respaldo: { startsWith: 'respaldos/' } }
    });
    stats.atrasos.total = atrasosList.length;
    for (const item of atrasosList) {
      try {
        const base64Str = await revertRecord(item.url_respaldo!);
        await this.prisma.atrasos.update({
          where: { id: item.id },
          data: { url_respaldo: base64Str }
        });
        stats.atrasos.reverted++;
      } catch (err: any) {
        stats.atrasos.failed++;
        stats.errors.push(`Atrasos #${item.id}: ${err.message}`);
      }
    }

    // 6. Revert Procedimientos
    const procedimientosList = await this.prisma.procedimientos.findMany({
      where: { url_respaldo: { startsWith: 'respaldos/' } }
    });
    stats.procedimientos.total = procedimientosList.length;
    for (const item of procedimientosList) {
      try {
        const base64Str = await revertRecord(item.url_respaldo!);
        await this.prisma.procedimientos.update({
          where: { id: item.id },
          data: { url_respaldo: base64Str }
        });
        stats.procedimientos.reverted++;
      } catch (err: any) {
        stats.procedimientos.failed++;
        stats.errors.push(`Procedimientos #${item.id}: ${err.message}`);
      }
    }

    return stats;
  }

  private parseBase64(dataStr: string) {
    const match = dataStr.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return null;
    return {
      mimeType: match[1],
      buffer: Buffer.from(match[2], 'base64')
    };
  }
}

