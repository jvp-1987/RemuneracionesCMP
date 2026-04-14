import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCentroSaludDto } from './dto/create-centro-salud.dto';
import { UpdateCentroSaludDto } from './dto/update-centro-salud.dto';

@Injectable()
export class CentrosSaludService {
  constructor(private readonly prisma: PrismaService) {}

  create(createCentroSaludDto: CreateCentroSaludDto) {
    return this.prisma.centroSalud.create({
      data: createCentroSaludDto,
    });
  }

  findAll() {
    return this.prisma.centroSalud.findMany();
  }

  async findOne(id: number) {
    const centro = await this.prisma.centroSalud.findUnique({
      where: { id },
    });
    if (!centro) {
      throw new NotFoundException(`Centro de Salud #${id} not found`);
    }
    return centro;
  }

  async update(id: number, updateCentroSaludDto: UpdateCentroSaludDto) {
    await this.findOne(id); // Ensure it exists
    return this.prisma.centroSalud.update({
      where: { id },
      data: updateCentroSaludDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id); // Ensure it exists
    return this.prisma.centroSalud.delete({
      where: { id },
    });
  }
}
