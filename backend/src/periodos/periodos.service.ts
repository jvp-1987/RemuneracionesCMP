import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePeriodoDto } from './dto/create-periodo.dto';
import { UpdatePeriodoDto } from './dto/update-periodo.dto';

@Injectable()
export class PeriodosService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreatePeriodoDto) {
    return this.prisma.periodo.create({ data: dto });
  }

  findAll() {
    return this.prisma.periodo.findMany({ orderBy: [{ anio: 'desc' }, { mes: 'desc' }] });
  }

  async findOne(id: number) {
    const periodo = await this.prisma.periodo.findUnique({ where: { id } });
    if (!periodo) throw new NotFoundException(`Periodo #${id} no encontrado`);
    return periodo;
  }

  async update(id: number, dto: UpdatePeriodoDto) {
    await this.findOne(id);
    return this.prisma.periodo.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.periodo.delete({ where: { id } });
  }
}
