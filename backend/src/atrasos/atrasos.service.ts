import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAtrasoDto } from './dto/create-atraso.dto';
import { UpdateAtrasoDto } from './dto/update-atraso.dto';

@Injectable()
export class AtrasosService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateAtrasoDto) {
    return this.prisma.atrasos.create({ data: dto });
  }

  findAll() {
    return this.prisma.atrasos.findMany({ include: { funcionario: true } });
  }

  async findOne(id: number) {
    const record = await this.prisma.atrasos.findUnique({ where: { id }, include: { funcionario: true } });
    if (!record) throw new NotFoundException(`Atraso #${id} no encontrado`);
    return record;
  }

  async update(id: number, dto: UpdateAtrasoDto) {
    await this.findOne(id);
    return this.prisma.atrasos.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.atrasos.delete({ where: { id } });
  }
}
