import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AlertasRrhhService {
  constructor(private prisma: PrismaService) {}

  async getAlertas() {
    const today = new Date();
    const threshold60 = new Date(today);
    threshold60.setDate(today.getDate() + 60);

    // Contratos Vigentes que vencen pronto O ya vencieron
    const contratosPorVencer = await this.prisma.contrato.findMany({
      where: {
        estado: 'Vigente',
        fecha_termino: {
          lte: threshold60,
          not: null
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

    // Asignaciones Vigentes que vencen pronto O ya vencieron
    const asignacionesPorExpirar = await this.prisma.asignacionEspecial.findMany({
      where: {
        estado_validacion: 'APROBADO',
        fecha_termino: {
          lte: threshold60,
          not: null
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

    // Auditoría de Calidad de Datos
    const funcionariosInconsistentes = await this.prisma.funcionario.findMany({
      where: {
        OR: [
          { categoria_aps: null },
          { categoria_aps: '' },
          { nivel_aps: null },
          { jornada_horas: null },
          { jornada_horas: 0 }
        ]
      },
      select: {
        rut: true,
        nombre_completo: true,
        categoria_aps: true,
        nivel_aps: true,
        jornada_horas: true
      }
    });

    const auditoria = funcionariosInconsistentes.map(f => {
      const faltantes = [];
      if (!f.categoria_aps) faltantes.push('Categoría');
      if (!f.nivel_aps) faltantes.push('Nivel');
      if (!f.jornada_horas) faltantes.push('Jornada');
      
      return {
        id: f.rut,
        funcionario: f.nombre_completo,
        rut: f.rut,
        detalle: `Falta: ${faltantes.join(', ')}`,
        severidad: 'CRITICO'
      };
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
      })),
      auditoria
    };
  }
}
