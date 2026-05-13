import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IngresosService {
  constructor(private prisma: PrismaService) {}

  async guardarIngresos(data: any, user: any) {
    const { centro_salud_id, periodo_id, tipo, transacciones } = data;

    if (!centro_salud_id || !periodo_id || !tipo || !transacciones || !Array.isArray(transacciones)) {
      throw new BadRequestException('Datos inválidos. Se requiere centro_salud_id, periodo_id, tipo y transacciones.');
    }

    // 1. Validaciones de Maestros
    const centro = await this.prisma.centroSalud.findUnique({
      where: { id: parseInt(centro_salud_id) }
    });

    if (!centro) {
      throw new BadRequestException(`El Centro de Salud ID ${centro_salud_id} no existe.`);
    }

    const periodo = await this.prisma.periodo.findUnique({
      where: { id: parseInt(periodo_id) }
    });

    if (!periodo) {
      throw new BadRequestException(`El período ID ${periodo_id} no existe.`);
    }

    if (periodo.estado === 'Cerrado') {
      throw new BadRequestException(`El período ${periodo.mes}/${periodo.anio} está CERRADO.`);
    }

    // 2. Control de Consolidado y Lock de Seguridad
    let consolidado = await this.prisma.consolidado.findFirst({
      where: {
        centro_salud_id: centro.id,
        periodo_id: periodo.id,
      }
    });

    if (consolidado && consolidado.vb_control_interno && user?.rol_enum === 'CENTRO_SALUD') {
      throw new ForbiddenException('Edición bloqueada: El consolidado ya está validado por Control Interno.');
    }

    if (!consolidado) {
      consolidado = await this.prisma.consolidado.create({
        data: {
          centro_salud_id: centro.id,
          periodo_id: periodo.id,
          estado_actual_enum: 'En Proceso',
        }
      });
    }

    // 3. Procesamiento Atómico con Transacción
    return this.prisma.$transaction(async (txPrisma) => {
      let count = 0;

      for (const tx of transacciones) {
        if (!tx.rut) continue;
        
        // Extracción flexible del documento por si el frontend varía la llave
        const urlRespaldo = tx.url_respaldo || tx.documento_respaldo || tx.respaldo || tx.archivo || null;

        if (tipo === 'fondos_presupuestarios' || tipo === 'programas_he' || tipo === 'horas_extras') {
          let programa_id = 1;
          
          // Asegurar programa base
          const checkProg = await txPrisma.programa.findUnique({ where: { id: 1 } });
          if (!checkProg) {
            await txPrisma.programa.create({
              data: { id: 1, nombre: 'PRESUPUESTARIO', categoria_enum: 'PRESUPUESTARIO' }
            });
          }

          if (tipo === 'programas_he' && tx.programa_nombre) {
            const prog = await txPrisma.programa.findFirst({
              where: { nombre: { contains: tx.programa_nombre.substring(0, 15) } }
            });
            if (prog) programa_id = prog.id;
          }

          const existingHE = tx.id 
            ? await txPrisma.horasExtras.findUnique({ where: { id: tx.id } }) 
            : await txPrisma.horasExtras.findFirst({
                where: { consolidado_id: consolidado!.id, funcionario_rut: tx.rut, programa_id }
              });

          const heData = {
            cantidad_25: parseFloat(tx.cantidad_25 || 0) || 0,
            cantidad_50: parseFloat(tx.cantidad_50 || 0) || 0,
            fecha_inicio: tx.fecha_inicio ? new Date(tx.fecha_inicio) : new Date(),
            fecha_termino: tx.fecha_termino ? new Date(tx.fecha_termino) : new Date(),
            observaciones_25: tx.observaciones || tx.programa_nombre || '',
            url_respaldo: urlRespaldo,
          };

          if (existingHE) {
            await txPrisma.horasExtras.update({ where: { id: existingHE.id }, data: heData });
          } else {
            await txPrisma.horasExtras.create({
              data: { consolidado_id: consolidado!.id, funcionario_rut: tx.rut, programa_id, ...heData }
            });
          }
          count++;

        } else if (tipo === 'programas_turno' || tipo === 'turnos' || tipo === 'turnos_urgencia') {
          const valHab = parseFloat(tx.valor_habil || 0) || 0;
          const valInh = parseFloat(tx.valor_inhabil || 0) || 0;
          const cantHab = parseInt(tx.cant_habil || 0) || 0;
          const cantInh = parseInt(tx.cant_inhabil || 0) || 0;
          const subtotal = (cantHab * valHab) + (cantInh * valInh);

          const existingTurno = tx.id 
            ? await txPrisma.turnosUrgencia.findUnique({ where: { id: tx.id } }) 
            : await txPrisma.turnosUrgencia.findFirst({
                where: { consolidado_id: consolidado!.id, funcionario_rut: tx.rut }
              });

          const turnoData = {
            cant_turnos_habiles: cantHab,
            valor_habil: valHab,
            cant_turnos_inhabiles: cantInh,
            valor_inhabil: valInh,
            monto_calculado: parseFloat(subtotal.toString()),
            fecha_inicio: tx.fecha_inicio ? new Date(tx.fecha_inicio) : new Date(),
            fecha_termino: tx.fecha_termino ? new Date(tx.fecha_termino) : new Date(),
            url_respaldo: urlRespaldo,
          };

          if (existingTurno) {
            await txPrisma.turnosUrgencia.update({ where: { id: existingTurno.id }, data: turnoData });
          } else {
            await txPrisma.turnosUrgencia.create({
              data: { consolidado_id: consolidado!.id, funcionario_rut: tx.rut, ...turnoData }
            });
          }
          count++;

        } else if (tipo === 'viaticos') {
          const existingViatico = tx.id 
            ? await txPrisma.viaticos.findUnique({ where: { id: tx.id } }) 
            : await txPrisma.viaticos.findFirst({
                where: { consolidado_id: consolidado!.id, funcionario_rut: tx.rut }
              });

          const viaticoData = {
            tipo_destino: tx.tipo_destino || 'DENTRO COMUNA',
            // Extracción flexible por si el frontend cambia la llave del monto
            monto_calculado: parseFloat(tx.monto || tx.monto_calculado || tx.valor || tx.viaticos || 0),
            fecha_inicio: tx.fecha_inicio ? new Date(tx.fecha_inicio) : new Date(),
            fecha_termino: tx.fecha_termino ? new Date(tx.fecha_termino) : new Date(),
            justificacion: tx.observaciones || '',
            url_respaldo: urlRespaldo,
          };

          if (existingViatico) {
            await txPrisma.viaticos.update({ where: { id: existingViatico.id }, data: viaticoData });
          } else {
            await txPrisma.viaticos.create({
              data: { consolidado_id: consolidado!.id, funcionario_rut: tx.rut, ...viaticoData }
            });
          }
          count++;

        } else if (tipo === 'atrasos') {
          const existingAtraso = tx.id 
            ? await txPrisma.atrasos.findUnique({ where: { id: tx.id } }) 
            : await txPrisma.atrasos.findFirst({
                where: { consolidado_id: consolidado!.id, funcionario_rut: tx.rut }
              });

          // Extraemos solo los números del string de tiempo (ej: "45 min" -> 45)
          const minutosRaw = parseInt(String(tx.minutos || tx.tiempo || '0').replace(/[^0-9]/g, '')) || 0;

          const atrasoData = {
            tiempo_descuento: tx.tiempo || `${minutosRaw} min`,
            minutos: minutosRaw,
            concepto: tx.observaciones || tx.concepto || '',
            fecha_inicio: tx.fecha_inicio ? new Date(tx.fecha_inicio) : new Date(),
            fecha_termino: tx.fecha_termino ? new Date(tx.fecha_termino) : new Date(),
            url_respaldo: urlRespaldo,
          };

          if (existingAtraso) {
            await txPrisma.atrasos.update({ where: { id: existingAtraso.id }, data: atrasoData });
          } else {
            await txPrisma.atrasos.create({
              data: { consolidado_id: consolidado!.id, funcionario_rut: tx.rut, ...atrasoData }
            });
          }
          count++;
        } else {
          throw new BadRequestException(`El tipo de novedad '${tipo}' no es reconocido por el sistema.`);
        }
      }

      return { success: true, count, consolidado_id: consolidado!.id };
    });
  }
}
