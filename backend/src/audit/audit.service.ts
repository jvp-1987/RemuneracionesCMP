import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async createLog(data: {
    tipo_modulo: string,
    registro_id: number,
    usuario_nombre: string,
    campo_afectado: string,
    valor_anterior: string,
    valor_nuevo: string,
  }) {
    return this.prisma.historialAuditoria.create({
      data: {
        usuario_nombre: data.usuario_nombre,
        tipo_modulo: data.tipo_modulo,
        registro_id: data.registro_id,
        campo_afectado: data.campo_afectado,
        valor_anterior: String(data.valor_anterior),
        valor_nuevo: String(data.valor_nuevo),
      },
    });
  }

  async record(
    usuarioNombre: string,
    tipoModulo: string,
    registroId: number,
    campoAfectado: string,
    valorAnterior: string,
    valorNuevo: string,
  ) {
    return this.createLog({
      usuario_nombre: usuarioNombre,
      tipo_modulo: tipoModulo,
      registro_id: registroId,
      campo_afectado: campoAfectado,
      valor_anterior: valorAnterior,
      valor_nuevo: valorNuevo
    });
  }
}
