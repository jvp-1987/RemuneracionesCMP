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

    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. Validaciones de Maestros (dentro de transacción para consistencia)
        const centro = await tx.centroSalud.findUnique({
          where: { id: parseInt(centro_salud_id) }
        });

        if (!centro) {
          throw new BadRequestException(`El Centro de Salud ID ${centro_salud_id} no existe.`);
        }

        const periodo = await tx.periodo.findUnique({
          where: { id: parseInt(periodo_id) }
        });

        if (!periodo) {
          throw new BadRequestException(`El período ID ${periodo_id} no existe.`);
        }

        if (periodo.estado === 'Cerrado') {
          throw new BadRequestException(`El período ${periodo.mes}/${periodo.anio} está CERRADO.`);
        }

        // 2. Control de Consolidado y Lock de Seguridad
        let consolidado = await tx.consolidado.findFirst({
          where: {
            centro_salud_id: centro.id,
            periodo_id: periodo.id,
          }
        });

        if (consolidado && consolidado.vb_control_interno && user?.rol_enum === 'CENTRO_SALUD') {
          throw new ForbiddenException('Edición bloqueada: El consolidado ya está validado por Control Interno.');
        }

        if (!consolidado) {
          consolidado = await tx.consolidado.create({
            data: {
              centro_salud_id: centro.id,
              periodo_id: periodo.id,
              estado_actual_enum: 'En Proceso',
            }
          });
        }

        let count = 0;

        for (const trx of transacciones) {
          if (!trx.rut) continue;

          if (tipo === 'fondos_presupuestarios' || tipo === 'programas_he') {
            let programa_id = 1;
            
            const checkProg = await tx.programa.findUnique({ where: { id: 1 } });
            if (!checkProg) {
              await tx.programa.create({
                data: { id: 1, nombre: 'PRESUPUESTARIO', categoria_enum: 'PRESUPUESTARIO' }
              });
            }

            if (tipo === 'programas_he' && trx.programa_nombre) {
              const prog = await tx.programa.findFirst({
                where: { nombre: { contains: trx.programa_nombre.substring(0, 15) } }
              });
              if (prog) programa_id = prog.id;
            }

            const existingHE = await tx.horasExtras.findFirst({
              where: { consolidado_id: consolidado.id, funcionario_rut: trx.rut, programa_id }
            });

            const heData = {
              cantidad_25: parseFloat(trx.cantidad_25 || 0) || 0,
              cantidad_50: parseFloat(trx.cantidad_50 || 0) || 0,
              fecha_inicio: trx.fecha_inicio ? new Date(trx.fecha_inicio) : new Date(),
              fecha_termino: trx.fecha_termino ? new Date(trx.fecha_termino) : new Date(),
              observaciones_25: trx.observaciones || trx.programa_nombre || '',
              url_respaldo: trx.url_respaldo || null,
            };

            if (existingHE) {
              await tx.horasExtras.update({ where: { id: existingHE.id }, data: heData });
            } else {
              await tx.horasExtras.create({
                data: { consolidado_id: consolidado.id, funcionario_rut: trx.rut, programa_id, ...heData }
              });
            }
            count++;

          } else if (tipo === 'programas_turno') {
            const valHab = parseFloat(trx.valor_habil || 0) || 0;
            const valInh = parseFloat(trx.valor_inhabil || 0) || 0;
            const cantHab = parseInt(trx.cant_habil || 0) || 0;
            const cantInh = parseInt(trx.cant_inhabil || 0) || 0;
            const subtotal = (cantHab * valHab) + (cantInh * valInh);

            const existingTurno = await tx.turnosUrgencia.findFirst({
              where: { consolidado_id: consolidado.id, funcionario_rut: trx.rut }
            });

            const turnoData = {
              cant_turnos_habiles: cantHab,
              valor_habil: valHab,
              cant_turnos_inhabiles: cantInh,
              valor_inhabil: valInh,
              monto_calculado: parseFloat(subtotal.toString()),
              fecha_inicio: trx.fecha_inicio ? new Date(trx.fecha_inicio) : new Date(),
              fecha_termino: trx.fecha_termino ? new Date(trx.fecha_termino) : new Date(),
              url_respaldo: trx.url_respaldo || null,
            };

            if (existingTurno) {
              await tx.turnosUrgencia.update({ where: { id: existingTurno.id }, data: turnoData });
            } else {
              await tx.turnosUrgencia.create({
                data: { consolidado_id: consolidado.id, funcionario_rut: trx.rut, ...turnoData }
              });
            }
            count++;

          } else if (tipo === 'viaticos') {
            const existingViatico = await tx.viaticos.findFirst({
              where: { consolidado_id: consolidado.id, funcionario_rut: trx.rut }
            });

            const viaticoData = {
              tipo_destino: trx.tipo_destino || 'DENTRO COMUNA',
              monto_calculado: parseFloat(trx.monto || 0),
              fecha_inicio: trx.fecha_inicio ? new Date(trx.fecha_inicio) : new Date(),
              fecha_termino: trx.fecha_termino ? new Date(trx.fecha_termino) : new Date(),
              justificacion: trx.observaciones || '',
              url_respaldo: trx.url_respaldo || null,
            };

            if (existingViatico) {
              await tx.viaticos.update({ where: { id: existingViatico.id }, data: viaticoData });
            } else {
              await tx.viaticos.create({
                data: { consolidado_id: consolidado.id, funcionario_rut: trx.rut, ...viaticoData }
              });
            }
            count++;

          } else if (tipo === 'atrasos') {
            const existingAtraso = await tx.atrasos.findFirst({
              where: { consolidado_id: consolidado.id, funcionario_rut: trx.rut }
            });

            const atrasoData = {
              tiempo_descuento: trx.tiempo || '0',
              fecha_inicio: trx.fecha_inicio ? new Date(trx.fecha_inicio) : new Date(),
              fecha_termino: trx.fecha_termino ? new Date(trx.fecha_termino) : new Date(),
            };

            if (existingAtraso) {
              await tx.atrasos.update({ where: { id: existingAtraso.id }, data: atrasoData });
            } else {
              await tx.atrasos.create({
                data: { consolidado_id: consolidado.id, funcionario_rut: trx.rut, ...atrasoData }
              });
            }
            count++;
          } else {
            throw new BadRequestException(`El tipo de novedad '${tipo}' no es reconocido por el sistema.`);
          }
        }

        return { success: true, count, consolidado_id: consolidado.id };
      });
    } catch (error) {
      console.error('Error en guardarIngresos:', error);
      throw error;
    }
  }
}
