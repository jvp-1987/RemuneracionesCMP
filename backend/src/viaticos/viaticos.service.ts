import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateViaticoDto } from './dto/create-viatico.dto';
import { UpdateViaticoDto } from './dto/update-viatico.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ViaticosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  create(dto: CreateViaticoDto) {
    return this.prisma.viaticos.create({ data: dto });
  }

  findAll() {
    return this.prisma.viaticos.findMany({ include: { funcionario: true } });
  }

  async findOne(id: number) {
    const record = await this.prisma.viaticos.findUnique({ where: { id }, include: { funcionario: true, consolidado: true } });
    if (!record) throw new NotFoundException(`Viático #${id} no encontrado`);
    return record;
  }

  async update(user: any, id: number, dto: UpdateViaticoDto) {
    const current = await this.findOne(id);

    if (current.consolidado.vb_control_interno && user.rol_enum === 'CENTRO_SALUD') {
      throw new ForbiddenException('Edición bloqueada: El consolidado ya está en revisión por Control Interno');
    }

    const fieldsToTrack = ['monto_calculado', 'rendicion_pasajes', 'tipo_destino', 'estado', 'justificacion', 'concepto'];
    for (const field of fieldsToTrack) {
      if ((dto as any)[field] !== undefined && String((dto as any)[field]) !== String((current as any)[field])) {
        await this.auditService.createLog({
          tipo_modulo: 'VIATICO',
          registro_id: id,
          usuario_nombre: user.nombre || 'Sistema',
          campo_afectado: field,
          valor_anterior: String((current as any)[field] || ''),
          valor_nuevo: String((dto as any)[field] || ''),
        });
      }
    }

    return this.prisma.viaticos.update({ where: { id }, data: dto });
  }

  async remove(user: any, id: number) {
    const current = await this.findOne(id);

    if (current.consolidado.vb_control_interno && user.rol_enum === 'CENTRO_SALUD') {
      throw new ForbiddenException('Eliminación bloqueada: El consolidado ya está en revisión por Control Interno');
    }

    await this.auditService.createLog({
      tipo_modulo: 'VIATICO',
      registro_id: id,
      usuario_nombre: user.nombre || 'Sistema',
      campo_afectado: 'REGISTRO_ELIMINADO',
      valor_anterior: 'EXISTE',
      valor_nuevo: 'ELIMINADO',
    });

    return this.prisma.viaticos.delete({ where: { id } });
  }
}
