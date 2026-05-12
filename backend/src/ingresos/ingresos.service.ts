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

    // Buscar o crear el Centro de Salud si no existe para evitar errores de FK
    let centro = await this.prisma.centroSalud.findUnique({
      where: { id: parseInt(centro_salud_id) }
    });

    if (!centro) {
      centro = await this.prisma.centroSalud.create({
        data: { 
          id: parseInt(centro_salud_id), 
          nombre: centro_salud_id === '1' ? 'CESFAM Panguipulli' : `Centro ${centro_salud_id}` 
        }
      });
    }

    // Buscar o crear el Periodo si no existe para evitar errores de FK
    let periodo = await this.prisma.periodo.findUnique({
        where: { id: parseInt(periodo_id) }
    });

    if (!periodo) {
        throw new BadRequestException(`El período ID ${periodo_id} no existe. Por favor inicialice los periodos en el Panel de Control.`);
    }

    if (periodo.estado === 'Cerrado') {
        throw new BadRequestException(`El período ${periodo.mes}/${periodo.anio} está CERRADO. No se pueden ingresar nuevas transacciones.`);
    }

    // Buscar o crear el consolidado para este periodo y centro
    let consolidado = await this.prisma.consolidado.findFirst({
      where: {
        centro_salud_id: centro.id,
        periodo_id: periodo.id,
      }
    });

    if (!consolidado) {
      consolidado = await this.prisma.consolidado.create({
        data: {
          centro_salud_id: centro.id,
          periodo_id: periodo.id,
          estado_actual_enum: 'En Proceso',
        }
      });
    }

    // Pre-fetching de Programas para evitar consultas en el bucle
    const programas = await this.prisma.programa.findMany();
    let defaultPrograma = programas.find(p => p.id === 1);
    if (!defaultPrograma) {
      defaultPrograma = await this.prisma.programa.create({
        data: { id: 1, nombre: 'PRESUPUESTARIO', categoria_enum: 'PRESUPUESTARIO' }
      });
    }

    // Pre-fetching de registros existentes para evitar N+1 queries
    const [existingHE, existingTurnos, existingViaticos, existingAtrasos] = await Promise.all([
      this.prisma.horasExtras.findMany({ where: { consolidado_id: consolidado.id } }),
      this.prisma.turnosUrgencia.findMany({ where: { consolidado_id: consolidado.id } }),
      this.prisma.viaticos.findMany({ where: { consolidado_id: consolidado.id } }),
      this.prisma.atrasos.findMany({ where: { consolidado_id: consolidado.id } }),
    ]);

    const heMap = new Map(existingHE.map(h => [`${h.funcionario_rut}_${h.programa_id}`, h]));
    const turnoMap = new Map(existingTurnos.map(t => [t.funcionario_rut, t]));
    const viaticoMap = new Map(existingViaticos.map(v => [v.funcionario_rut, v]));
    const atrasoMap = new Map(existingAtrasos.map(a => [a.funcionario_rut, a]));

    const operations: any[] = [];
    let count = 0;

    for (const tx of transacciones) {
      if (!tx.rut) continue;

      if (tipo === 'fondos_presupuestarios' || tipo === 'programas_he') {
        let programa_id = defaultPrograma.id;
        if (tipo === 'programas_he' && tx.programa_nombre) {
          const prog = programas.find(p => p.nombre.includes(tx.programa_nombre.substring(0, 10)));
          if (prog) programa_id = prog.id;
        }

        const key = `${tx.rut}_${programa_id}`;
        const existing = heMap.get(key);
        const heData = {
          cantidad_25: parseFloat(tx.cantidad_25 || 0) || 0,
          cantidad_50: parseFloat(tx.cantidad_50 || 0) || 0,
          fecha_inicio: tx.fecha_inicio ? new Date(tx.fecha_inicio) : new Date(),
          fecha_termino: tx.fecha_termino ? new Date(tx.fecha_termino) : new Date(),
          observaciones_25: tx.observaciones || tx.programa_nombre || '',
          url_respaldo: tx.url_respaldo || null,
        };

        if (existing) {
          operations.push(this.prisma.horasExtras.update({ where: { id: existing.id }, data: heData }));
        } else {
          operations.push(this.prisma.horasExtras.create({
            data: { consolidado_id: consolidado.id, funcionario_rut: tx.rut, programa_id, ...heData }
          }));
        }
        count++;

      } else if (tipo === 'programas_turnos' || tipo === 'programas_turno') {
        const valHab = parseFloat(tx.valor_habil || 0) || 0;
        const valInh = parseFloat(tx.valor_inhabil || 0) || 0;
        const cantHab = parseInt(tx.cant_habil || 0) || 0;
        const cantInh = parseInt(tx.cant_inhabil || 0) || 0;
        const subtotal = (cantHab * valHab) + (cantInh * valInh);

        const existing = turnoMap.get(tx.rut);
        const turnoData = {
          cant_turnos_habiles: cantHab,
          valor_habil: valHab,
          cant_turnos_inhabiles: cantInh,
          valor_inhabil: valInh,
          monto_calculado: subtotal,
          fecha_inicio: tx.fecha_inicio ? new Date(tx.fecha_inicio) : new Date(),
          fecha_termino: tx.fecha_termino ? new Date(tx.fecha_termino) : new Date(),
          url_respaldo: tx.url_respaldo || null,
        };

        if (existing) {
          operations.push(this.prisma.turnosUrgencia.update({ where: { id: existing.id }, data: turnoData }));
        } else {
          operations.push(this.prisma.turnosUrgencia.create({
            data: { consolidado_id: consolidado.id, funcionario_rut: tx.rut, ...turnoData }
          }));
        }
        count++;

      } else if (tipo === 'viaticos') {
        const existing = viaticoMap.get(tx.rut);
        const viaticoData = {
          tipo_destino: tx.tipo_destino || 'DENTRO COMUNA',
          monto_calculado: parseFloat(tx.monto || 0),
          fecha_inicio: tx.fecha_inicio ? new Date(tx.fecha_inicio) : new Date(),
          fecha_termino: tx.fecha_termino ? new Date(tx.fecha_termino) : new Date(),
          justificacion: tx.observaciones || '',
          url_respaldo: tx.url_respaldo || null,
        };

        if (existing) {
          operations.push(this.prisma.viaticos.update({ where: { id: existing.id }, data: viaticoData }));
        } else {
          operations.push(this.prisma.viaticos.create({
            data: { consolidado_id: consolidado.id, funcionario_rut: tx.rut, ...viaticoData }
          }));
        }
        count++;

      } else if (tipo === 'atrasos') {
        const existing = atrasoMap.get(tx.rut);
        const atrasoData = {
          tiempo_descuento: tx.tiempo || '0',
          fecha_inicio: tx.fecha_inicio ? new Date(tx.fecha_inicio) : new Date(),
          fecha_termino: tx.fecha_termino ? new Date(tx.fecha_termino) : new Date(),
        };

        if (existing) {
          operations.push(this.prisma.atrasos.update({ where: { id: existing.id }, data: atrasoData }));
        } else {
          operations.push(this.prisma.atrasos.create({
            data: { consolidado_id: consolidado.id, funcionario_rut: tx.rut, ...atrasoData }
          }));
        }
        count++;
      }
    }

    // Ejecutar todas las operaciones en una sola transacción
    if (operations.length > 0) {
      await this.prisma.$transaction(operations);
    }

    return { success: true, count, consolidado_id: consolidado.id };
  }
}
