import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AlertasRrhhService {
  constructor(private prisma: PrismaService) {}

  async getAlertas() {
    const today = new Date();
    const threshold60 = new Date(today);
    threshold60.setDate(today.getDate() + 60);

    const contratosPorVencer = await this.prisma.contrato.findMany({
      where: {
        estado: 'Vigente',
        fecha_termino: {
          lte: threshold60,
          gte: today
        }
      },
      include: {
        funcionario: {
          select: {
            rut: true,
            nombre_completo: true,
          }
        }
      },
      orderBy: {
        fecha_termino: 'asc'
      }
    });

    const asignacionesPorExpirar = await this.prisma.asignacionEspecial.findMany({
      where: {
        estado_validacion: 'APROBADO',
        fecha_termino: {
          lte: threshold60,
          gte: today
        }
      },
      include: {
        funcionario: {
          select: {
            rut: true,
            nombre_completo: true,
          }
        }
      },
      orderBy: {
        fecha_termino: 'asc'
      }
    });

    return {
      contratos: contratosPorVencer.map(c => ({
        id: c.id,
        tipo: 'Contrato',
        funcionario: c.funcionario.nombre_completo,
        rut: c.funcionario.rut,
        detalle: `${c.tipo_contrato} - ${c.cargo}`,
        fecha_termino: c.fecha_termino,
        dias_restantes: Math.ceil((new Date(c.fecha_termino!).getTime() - today.getTime()) / (1000 * 3600 * 24))
      })),
      asignaciones: asignacionesPorExpirar.map(a => ({
        id: a.id,
        tipo: 'Asignacion',
        funcionario: a.funcionario.nombre_completo,
        rut: a.funcionario.rut,
        detalle: `${a.tipo_asignacion} (Res N° ${a.nro_resolucion})`,
        fecha_termino: a.fecha_termino,
        dias_restantes: Math.ceil((new Date(a.fecha_termino!).getTime() - today.getTime()) / (1000 * 3600 * 24))
      }))
    };
  }
}
