import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContratosService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.contrato.findMany();
  }

  async findByFuncionario(rut: string) {
    return this.prisma.contrato.findMany({
      where: { funcionario_rut: rut },
    });
  }

  async create(data: any) {
    data.fecha_inicio = new Date(data.fecha_inicio);
    if (data.fecha_termino) data.fecha_termino = new Date(data.fecha_termino);
    return this.prisma.contrato.create({ data });
  }

  async update(id: number, data: any) {
    if (data.fecha_inicio) data.fecha_inicio = new Date(data.fecha_inicio);
    if (data.fecha_termino) data.fecha_termino = new Date(data.fecha_termino);
    return this.prisma.contrato.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    return this.prisma.contrato.delete({
      where: { id },
    });
  }
}
