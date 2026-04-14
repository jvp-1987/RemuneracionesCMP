import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProcedimientoDto } from './dto/create-procedimiento.dto';
import { UpdateProcedimientoDto } from './dto/update-procedimiento.dto';

@Injectable()
export class ProcedimientosService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateProcedimientoDto) {
    return this.prisma.procedimientos.create({ data: dto });
  }

  findAll() {
    return this.prisma.procedimientos.findMany({ include: { funcionario: true } });
  }

  async findOne(id: number) {
    const record = await this.prisma.procedimientos.findUnique({ where: { id }, include: { funcionario: true } });
    if (!record) throw new NotFoundException(`Procedimiento #${id} no encontrado`);
    return record;
  }

  async update(id: number, dto: UpdateProcedimientoDto) {
    await this.findOne(id);
    return this.prisma.procedimientos.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.procedimientos.delete({ where: { id } });
  }
}
