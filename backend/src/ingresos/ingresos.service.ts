import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IngresosService {
  constructor(private prisma: PrismaService) {}

  async guardarIngresos(data: any) {
    const { centro_salud_id, periodo_id, tipo, transacciones } = data;

    if (!centro_salud_id || !periodo_id || !tipo || !transacciones || !Array.isArray(transacciones)) {
      throw new BadRequestException('Datos inválidos. Se requiere centro_salud_id, periodo_id, tipo y transacciones.');
    }

    // Buscar o crear el consolidado para este periodo y centro
    let consolidado = await this.prisma.consolidado.findFirst({
      where: {
        centro_salud_id: parseInt(centro_salud_id),
        periodo_id: parseInt(periodo_id),
      }
    });

    if (!consolidado) {
      consolidado = await this.prisma.consolidado.create({
        data: {
          centro_salud_id: parseInt(centro_salud_id),
          periodo_id: parseInt(periodo_id),
          estado_actual_enum: 'En Proceso',
        }
      });
    }

    let count = 0;

    // Procesar según tipo
    for (const tx of transacciones) {
      if (!tx.rut) continue;

      if (tipo === 'fondos_presupuestarios' || tipo === 'programas_he') {
        let programa_id = 1; // 1 = PRESUPUESTARIO por defecto
        
        if (tipo === 'programas_he' && tx.programa_nombre) {
          const prog = await this.prisma.programa.findFirst({
            where: { nombre: { contains: tx.programa_nombre.substring(0, 15) } }
          });
          if (prog) programa_id = prog.id;
        }

        await this.prisma.horasExtras.create({
          data: {
            consolidado_id: consolidado.id,
            funcionario_rut: tx.rut,
            programa_id: programa_id,
            cantidad_25: parseFloat(tx.cantidad_25 || 0),
            cantidad_50: parseFloat(tx.cantidad_50 || 0),
            fecha_inicio: tx.fecha_inicio ? new Date(tx.fecha_inicio) : new Date(),
            fecha_termino: tx.fecha_termino ? new Date(tx.fecha_termino) : new Date(),
            observaciones_25: tx.observaciones || tx.programa_nombre || '',
          }
        });
        count++;
      } else if (tipo === 'programas_turno') {
        const subtotal = (Number(tx.cant_habil || 0) * Number(tx.valor_habil || 0)) + 
                         (Number(tx.cant_inhabil || 0) * Number(tx.valor_inhabil || 0));

        await this.prisma.turnosUrgencia.create({
          data: {
            consolidado_id: consolidado.id,
            funcionario_rut: tx.rut,
            cant_turnos_habiles: parseInt(tx.cant_habil || '0'),
            cant_turnos_inhabiles: parseInt(tx.cant_inhabil || '0'),
            monto_calculado: parseFloat(subtotal.toString()),
            fecha_inicio: tx.fecha_inicio ? new Date(tx.fecha_inicio) : new Date(),
            fecha_termino: tx.fecha_termino ? new Date(tx.fecha_termino) : new Date(),
            // Guardando el nombre del programa en memoria hasta añadir relación
          }
        });
        count++;
      } else if (tipo === 'viaticos') {
        await this.prisma.viaticos.create({
          data: {
            consolidado_id: consolidado.id,
            funcionario_rut: tx.rut,
            tipo_destino: tx.tipo_destino || 'DENTRO COMUNA',
            monto_calculado: parseFloat(tx.monto || 0),
            fecha_inicio: tx.fecha_inicio ? new Date(tx.fecha_inicio) : new Date(),
            fecha_termino: tx.fecha_termino ? new Date(tx.fecha_termino) : new Date(),
            justificacion: tx.observaciones || '',
          }
        });
        count++;
      } else if (tipo === 'atrasos') {
        await this.prisma.atrasos.create({
          data: {
            consolidado_id: consolidado.id,
            funcionario_rut: tx.rut,
            tiempo_descuento: tx.tiempo || '0',
            fecha_inicio: tx.fecha_inicio ? new Date(tx.fecha_inicio) : new Date(),
            fecha_termino: tx.fecha_termino ? new Date(tx.fecha_termino) : new Date(),
          }
        });
        count++;
      }
    }

    return { success: true, count, consolidado_id: consolidado.id };
  }
}
