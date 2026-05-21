import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AsignacionesService {
  constructor(private prisma: PrismaService) {}

  // ================= CATÁLOGO =================
  async getCatalogo() {
    return this.prisma.catalogoAsignacion.findMany({
      orderBy: { nombre: 'asc' },
    });
  }

  async createCatalogo(data: { nombre: string }) {
    return this.prisma.catalogoAsignacion.create({
      data: { nombre: data.nombre },
    });
  }

  async toggleCatalogoEstado(id: number) {
    const asig = await this.prisma.catalogoAsignacion.findUnique({ where: { id } });
    if (!asig) throw new NotFoundException('Asignación no encontrada en el catálogo');
    return this.prisma.catalogoAsignacion.update({
      where: { id },
      data: { estado: asig.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO' },
    });
  }

  async updateCatalogo(id: number, data: { nombre: string }) {
    return this.prisma.catalogoAsignacion.update({
      where: { id },
      data: { nombre: data.nombre },
    });
  }

  async deleteCatalogo(id: number) {
    const count = await this.prisma.asignacionFuncionario.count({ where: { asignacion_id: id } });
    if (count > 0) {
      throw new BadRequestException('No se puede eliminar la asignación porque ya está asignada a uno o más funcionarios.');
    }
    return this.prisma.catalogoAsignacion.delete({ where: { id } });
  }

  // ================= ASIGNACIONES POR FUNCIONARIO =================
  async getAsignacionesFuncionario(rut: string) {
    return this.prisma.asignacionFuncionario.findMany({
      where: { funcionario_rut: rut },
      include: { catalogo: true },
      orderBy: { fecha_inicio: 'desc' },
    });
  }

  async createAsignacionFuncionario(data: {
    funcionario_rut: string;
    asignacion_id: number;
    tipo_calculo: string;
    valor: number;
    fecha_inicio: string;
    fecha_termino?: string;
    num_resolucion?: string;
  }) {
    // Asegurar que el funcionario exista
    await this.prisma.funcionario.upsert({
      where: { rut: data.funcionario_rut },
      update: {},
      create: {
        rut: data.funcionario_rut,
        nombre_completo: 'Funcionario',
        profesion_enum: 'POR_CLASIFICAR',
      },
    });

    return this.prisma.asignacionFuncionario.create({
      data: {
        funcionario_rut: data.funcionario_rut,
        asignacion_id: data.asignacion_id,
        tipo_calculo: data.tipo_calculo,
        valor: data.valor,
        fecha_inicio: new Date(data.fecha_inicio),
        fecha_termino: data.fecha_termino ? new Date(data.fecha_termino) : null,
        num_resolucion: data.num_resolucion,
      },
    });
  }

  async updateAsignacionFuncionario(id: number, data: any) {
    if (data.fecha_inicio) data.fecha_inicio = new Date(data.fecha_inicio);
    if (data.fecha_termino) data.fecha_termino = new Date(data.fecha_termino);
    return this.prisma.asignacionFuncionario.update({
      where: { id },
      data,
    });
  }

  async toggleAsignacionFuncionarioEstado(id: number) {
    const asig = await this.prisma.asignacionFuncionario.findUnique({ where: { id } });
    if (!asig) throw new NotFoundException('Asignación de funcionario no encontrada');
    return this.prisma.asignacionFuncionario.update({
      where: { id },
      data: { estado: asig.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO' },
    });
  }

  // ================= VERIFICACIÓN MENSUAL =================
  async generarVerificacionMensual(periodoId: number) {
    const periodo = await this.prisma.periodo.findUnique({ where: { id: periodoId } });
    if (!periodo) throw new NotFoundException('Período no encontrado');

    const periodoInicio = new Date(periodo.anio, periodo.mes - 1, 1);
    const periodoFin = new Date(periodo.anio, periodo.mes, 0);

    // Buscar asignaciones activas que caigan en este periodo
    const asignacionesActivas = await this.prisma.asignacionFuncionario.findMany({
      where: {
        estado: 'ACTIVO',
        fecha_inicio: { lte: periodoFin },
        OR: [
          { fecha_termino: null },
          { fecha_termino: { gte: periodoInicio } },
        ],
      },
    });

    for (const asig of asignacionesActivas) {
      // Upsert para generar el checklist
      await this.prisma.verificacionMensualAsignacion.upsert({
        where: {
          periodo_id_asignacion_funcionario_id: {
            periodo_id: periodoId,
            asignacion_funcionario_id: asig.id,
          },
        },
        update: {},
        create: {
          periodo_id: periodoId,
          asignacion_funcionario_id: asig.id,
          estado_verificacion: 'PENDIENTE',
        },
      });
    }

    return this.getVerificacionMensual(periodoId);
  }

  async getVerificacionMensual(periodoId: number) {
    return this.prisma.verificacionMensualAsignacion.findMany({
      where: { periodo_id: periodoId },
      include: {
        asignacion: {
          include: {
            funcionario: true,
            catalogo: true,
          },
        },
      },
      orderBy: {
        asignacion: {
          funcionario: { nombre_completo: 'asc' },
        },
      },
    });
  }

  async updateEstadoVerificacion(id: number, estado_verificacion: string, observaciones?: string) {
    return this.prisma.verificacionMensualAsignacion.update({
      where: { id },
      data: { estado_verificacion, observaciones },
    });
  }
}
