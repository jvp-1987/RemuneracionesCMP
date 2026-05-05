import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AsignacionesEspecialesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.asignacionEspecial.findMany();
  }

  async findByFuncionario(rut: string) {
    return this.prisma.asignacionEspecial.findMany({
      where: { funcionario_rut: rut },
    });
  }

  async create(data: any) {
    data.fecha_inicio = new Date(data.fecha_inicio);
    if (data.fecha_termino) data.fecha_termino = new Date(data.fecha_termino);
    return this.prisma.asignacionEspecial.create({ data });
  }

  async update(id: number, data: any) {
    if (data.fecha_inicio) data.fecha_inicio = new Date(data.fecha_inicio);
    if (data.fecha_termino) data.fecha_termino = new Date(data.fecha_termino);
    return this.prisma.asignacionEspecial.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    return this.prisma.asignacionEspecial.delete({
      where: { id },
    });
  }
}
