import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async createLog(data: {
    tipo_modulo: string;
    registro_id: number;
    usuario_nombre: string;
    campo_afectado?: string;
    valor_anterior?: string;
    valor_nuevo?: string;
  }) {
    return this.prisma.historialAuditoria.create({
      data,
    });
  }

  async getLogsByRegistro(tipo: string, id: number) {
    return this.prisma.historialAuditoria.findMany({
      where: {
        tipo_modulo: tipo,
        registro_id: id,
      },
      orderBy: {
        fecha: 'desc',
      },
    });
  }
}
