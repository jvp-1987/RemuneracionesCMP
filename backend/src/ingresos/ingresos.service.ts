import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IngresosService {
  constructor(private prisma: PrismaService) {}

  async guardarIngresos(data: any, user: any) {
    const { centro_salud_id, periodo_id, tipo, transacciones } = data;

    console.log(`[IngresosService] Iniciando guardado. Tipo: ${tipo}, Centro: ${centro_salud_id}, Periodo: ${periodo_id}, Filas: ${transacciones?.length}`);

    if (!centro_salud_id || !periodo_id || !tipo || !transacciones || !Array.isArray(transacciones)) {
      throw new BadRequestException('Datos inválidos. Se requiere centro_salud_id, periodo_id, tipo y transacciones.');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // 1. Validaciones de Maestros
        const centro = await tx.centroSalud.findUnique({
          where: { id: parseInt(centro_salud_id) }
        });
        if (!centro) throw new BadRequestException(`El Centro de Salud ID ${centro_salud_id} no existe.`);

        const periodo = await tx.periodo.findUnique({
          where: { id: parseInt(periodo_id) }
        });
        if (!periodo) throw new BadRequestException(`El período ID ${periodo_id} no existe.`);

        if (periodo.estado === 'Cerrado') {
          throw new BadRequestException(`El período ${periodo.mes}/${periodo.anio} está CERRADO.`);
        }

        // 2. Control de Consolidado
        let consolidado = await tx.consolidado.findFirst({
          where: { centro_salud_id: centro.id, periodo_id: periodo.id }
        });

        if (consolidado && consolidado.vb_control_interno && user?.rol_enum === 'CENTRO_SALUD') {
          throw new ForbiddenException('Edición bloqueada: El consolidado ya está validado por Control Interno.');
        }

        if (!consolidado) {
          console.log(`[IngresosService] Creando nuevo consolidado para centro ${centro.id} y periodo ${periodo.id}`);
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
          if (!trx.rut) {
            console.log(`[IngresosService] Saltando fila sin RUT`);
            continue;
          }

          try {
            // Asegurar que el Funcionario existe para evitar errores de Foreign Key
            await tx.funcionario.upsert({
              where: { rut: trx.rut },
              update: {},
              create: {
                rut: trx.rut,
                nombre_completo: trx.nombre || trx.nombre_completo || 'Funcionario Agregado (Novedad)',
                profesion_enum: 'POR_CLASIFICAR',
              }
            });

            // Extracción flexible del documento de respaldo
            const urlRespaldo = trx.url_respaldo || trx.documento_respaldo || trx.respaldo || trx.archivo || null;

            // Función auxiliar para obtener ID numérico real (evita NaN en findUnique)
            const getRealId = (id: any): number | null => {
              if (!id) return null;
              const parsed = parseInt(String(id));
              return isNaN(parsed) ? null : parsed;
            };

            const realId = getRealId(trx.id);

            if (tipo === 'fondos_presupuestarios' || tipo === 'programas_he' || tipo === 'horas_extras') {
              let programa_id = 1;
              const checkProg = await tx.programa.findUnique({ where: { id: 1 } });
              if (!checkProg) {
                await tx.programa.create({
                  data: { id: 1, nombre: 'PRESUPUESTARIO', categoria_enum: 'PRESUPUESTARIO' }
                });
              }

              if (tipo === 'programas_he' && trx.programa_nombre) {
                const prog = await tx.programa.findFirst({
                  where: { nombre: { contains: String(trx.programa_nombre).substring(0, 15) } }
                });
                if (prog) programa_id = prog.id;
              }

              const existingHE = realId 
                ? await tx.horasExtras.findUnique({ where: { id: realId } }) 
                : await tx.horasExtras.findFirst({
                    where: { consolidado_id: consolidado.id, funcionario_rut: trx.rut, programa_id }
                  });

              const heData = {
                cantidad_25: parseFloat(trx.cantidad_25 || 0) || 0,
                cantidad_50: parseFloat(trx.cantidad_50 || 0) || 0,
                fecha_inicio: trx.fecha_inicio ? new Date(trx.fecha_inicio) : new Date(),
                fecha_termino: trx.fecha_termino ? new Date(trx.fecha_termino) : new Date(),
                observaciones_25: trx.observaciones || trx.programa_nombre || '',
                url_respaldo: urlRespaldo,
              };

              if (existingHE) {
                await tx.horasExtras.update({ where: { id: existingHE.id }, data: heData });
              } else {
                await tx.horasExtras.create({
                  data: { consolidado_id: consolidado.id, funcionario_rut: trx.rut, programa_id, ...heData }
                });
              }
              count++;

            } else if (tipo === 'programas_turnos' || tipo === 'programas_turno' || tipo === 'turnos' || tipo === 'turnos_urgencia') {
              const valHab = parseFloat(trx.valor_habil || 0) || 0;
              const valInh = parseFloat(trx.valor_inhabil || 0) || 0;
              const cantHab = parseInt(trx.cant_habil || 0) || 0;
              const cantInh = parseInt(trx.cant_inhabil || 0) || 0;
              const subtotal = (cantHab * valHab) + (cantInh * valInh);

              const existingTurno = realId 
                ? await tx.turnosUrgencia.findUnique({ where: { id: realId } }) 
                : await tx.turnosUrgencia.findFirst({
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
                url_respaldo: urlRespaldo,
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
              const existingViatico = realId 
                ? await tx.viaticos.findUnique({ where: { id: realId } }) 
                : await tx.viaticos.findFirst({
                    where: { consolidado_id: consolidado.id, funcionario_rut: trx.rut }
                  });

              const viaticoData = {
                tipo_destino: trx.tipo_destino || 'DENTRO COMUNA',
                monto_calculado: parseFloat(trx.monto || trx.monto_calculado || trx.valor || trx.viaticos || 0),
                fecha_inicio: trx.fecha_inicio ? new Date(trx.fecha_inicio) : new Date(),
                fecha_termino: trx.fecha_termino ? new Date(trx.fecha_termino) : new Date(),
                justificacion: trx.observaciones || '',
                url_respaldo: urlRespaldo,
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
              const existingAtraso = realId 
                ? await tx.atrasos.findUnique({ where: { id: realId } }) 
                : await tx.atrasos.findFirst({
                    where: { consolidado_id: consolidado.id, funcionario_rut: trx.rut }
                  });

              const minutosRaw = parseInt(String(trx.minutos || trx.tiempo || '0').replace(/[^0-9]/g, '')) || 0;

              const atrasoData = {
                tiempo_descuento: trx.tiempo || `${minutosRaw} min`,
                minutos: minutosRaw,
                concepto: trx.observaciones || trx.concepto || '',
                fecha_inicio: trx.fecha_inicio ? new Date(trx.fecha_inicio) : new Date(),
                fecha_termino: trx.fecha_termino ? new Date(trx.fecha_termino) : new Date(),
                url_respaldo: urlRespaldo,
              };

              if (existingAtraso) {
                await tx.atrasos.update({ where: { id: existingAtraso.id }, data: atrasoData });
              } else {
                await tx.atrasos.create({
                  data: { consolidado_id: consolidado.id, funcionario_rut: trx.rut, ...atrasoData }
                });
              }
              count++;
            }
          } catch (rowError) {
            console.error(`[IngresosService] Error procesando fila para RUT ${trx.rut}:`, rowError);
            throw new BadRequestException(`Error en fila ${trx.rut}: ${rowError.message}`);
          }
        }

        console.log(`[IngresosService] Finalizado con éxito. Procesados: ${count}`);
        return { success: true, count, consolidado_id: consolidado.id };
      });
    } catch (error) {
      console.error('[IngresosService] Error fatal:', error);
      throw error;
    }
  }
}
