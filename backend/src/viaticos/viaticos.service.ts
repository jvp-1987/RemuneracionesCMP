import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateViaticoDto } from './dto/create-viatico.dto';
import { UpdateViaticoDto } from './dto/update-viatico.dto';

@Injectable()
export class ViaticosService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateViaticoDto) {
    return this.prisma.viaticos.create({ data: dto });
  }

  findAll() {
    return this.prisma.viaticos.findMany({ include: { funcionario: true } });
  }

  async findOne(id: number) {
    const record = await this.prisma.viaticos.findUnique({ where: { id }, include: { funcionario: true } });
    if (!record) throw new NotFoundException(`Viático #${id} no encontrado`);
    return record;
  }

  async update(id: number, dto: UpdateViaticoDto) {
    await this.findOne(id);
    return this.prisma.viaticos.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.viaticos.delete({ where: { id } });
  }
}
