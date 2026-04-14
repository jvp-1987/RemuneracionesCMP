import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  create(createUsuarioDto: CreateUsuarioDto) {
    return this.prisma.usuario.create({
      data: createUsuarioDto,
    });
  }

  findAll() {
    return this.prisma.usuario.findMany({
      include: { centro_salud: true }
    });
  }

  async findOne(id: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      include: { centro_salud: true }
    });
    if (!usuario) {
      throw new NotFoundException(`Usuario #${id} not found`);
    }
    return usuario;
  }

  async update(id: number, updateUsuarioDto: UpdateUsuarioDto) {
    await this.findOne(id);
    return this.prisma.usuario.update({
      where: { id },
      data: updateUsuarioDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.usuario.delete({
      where: { id },
    });
  }
}
