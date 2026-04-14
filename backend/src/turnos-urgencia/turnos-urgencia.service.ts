import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTurnoUrgenciaDto } from './dto/create-turno-urgencia.dto';
import { UpdateTurnoUrgenciaDto } from './dto/update-turno-urgencia.dto';

@Injectable()
export class TurnosUrgenciaService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateTurnoUrgenciaDto) {
    return this.prisma.turnosUrgencia.create({ data: dto });
  }

  findAll() {
    return this.prisma.turnosUrgencia.findMany({ include: { funcionario: true } });
  }

  async findOne(id: number) {
    const record = await this.prisma.turnosUrgencia.findUnique({ where: { id }, include: { funcionario: true } });
    if (!record) throw new NotFoundException(`Turno Urgencia #${id} no encontrado`);
    return record;
  }

  async update(id: number, dto: UpdateTurnoUrgenciaDto) {
    await this.findOne(id);
    return this.prisma.turnosUrgencia.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.turnosUrgencia.delete({ where: { id } });
  }
}
