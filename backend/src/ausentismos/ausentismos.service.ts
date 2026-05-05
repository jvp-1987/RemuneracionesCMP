import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AusentismosService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.ausentismo.findMany();
  }

  async findByFuncionario(rut: string) {
    return this.prisma.ausentismo.findMany({
      where: { funcionario_rut: rut },
    });
  }

  async create(data: any) {
    data.fecha_inicio = new Date(data.fecha_inicio);
    data.fecha_termino = new Date(data.fecha_termino);
    return this.prisma.ausentismo.create({ data });
  }

  async processWebhook(dto: any) {
    const funcionario = await this.prisma.funcionario.findUnique({
      where: { rut: dto.rut_funcionario }
    });

    if (!funcionario) {
      throw new Error(`Funcionario con RUT ${dto.rut_funcionario} no encontrado`);
    }

    let aplicaDescuento = dto.descuento_aplicable ?? false;
    const tipo = dto.tipo_permiso.toLowerCase();
    if (tipo.includes('sin goce') || tipo.includes('no remunerado')) {
      aplicaDescuento = true;
    }

    return this.prisma.ausentismo.create({
      data: {
        funcionario_rut: dto.rut_funcionario,
        tipo_ausentismo: dto.tipo_permiso,
        fecha_inicio: new Date(dto.fecha_inicio),
        fecha_termino: new Date(dto.fecha_termino),
        dias_habiles: dto.dias_habiles,
        descuento_aplicable: aplicaDescuento,
        estado_validacion: dto.estado === 'APROBADO' ? 'APROBADO' : 'PENDIENTE'
      }
    });
  }

  async update(id: number, data: any) {
    if (data.fecha_inicio) data.fecha_inicio = new Date(data.fecha_inicio);
    if (data.fecha_termino) data.fecha_termino = new Date(data.fecha_termino);
    return this.prisma.ausentismo.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    return this.prisma.ausentismo.delete({
      where: { id },
    });
  }
}
