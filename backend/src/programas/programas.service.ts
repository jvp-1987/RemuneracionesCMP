import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProgramaDto } from './dto/create-programa.dto';
import { UpdateProgramaDto } from './dto/update-programa.dto';

@Injectable()
export class ProgramasService {
  constructor(private readonly prisma: PrismaService) {}

  create(createProgramaDto: CreateProgramaDto) {
    return this.prisma.programa.create({
      data: createProgramaDto,
    });
  }

  findAll() {
    return this.prisma.programa.findMany();
  }

  async findOne(id: number) {
    const programa = await this.prisma.programa.findUnique({
      where: { id },
    });
    if (!programa) {
      throw new NotFoundException(`Programa #${id} not found`);
    }
    return programa;
  }

  async update(id: number, updateProgramaDto: UpdateProgramaDto) {
    await this.findOne(id);
    return this.prisma.programa.update({
      where: { id },
      data: updateProgramaDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.programa.delete({
      where: { id },
    });
  }
}
