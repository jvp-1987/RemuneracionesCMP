import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAtrasoDto } from './dto/create-atraso.dto';
import { UpdateAtrasoDto } from './dto/update-atraso.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AtrasosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  create(dto: CreateAtrasoDto) {
    return this.prisma.atrasos.create({ data: dto });
  }

  findAll() {
    return this.prisma.atrasos.findMany({ include: { funcionario: true } });
  }

  async findOne(id: number) {
    const record = await this.prisma.atrasos.findUnique({ where: { id }, include: { funcionario: true, consolidado: true } });
    if (!record) throw new NotFoundException(`Atraso #${id} no encontrado`);
    return record;
  }

  async update(user: any, id: number, dto: UpdateAtrasoDto) {
    const current = await this.findOne(id);

    if (current.consolidado.vb_control_interno && ['CENTRO_SALUD', 'SECRETARIA'].includes(user.rol_enum)) {
      throw new ForbiddenException('Edición bloqueada: El consolidado ya está en revisión por Control Interno');
    }

    const fieldsToTrack = ['minutos', 'monto_descuento', 'estado', 'concepto', 'tiempo_descuento'];
    for (const field of fieldsToTrack) {
      if ((dto as any)[field] !== undefined && String((dto as any)[field]) !== String((current as any)[field])) {
        await this.auditService.createLog({
          tipo_modulo: 'ATRASO',
          registro_id: id,
          usuario_nombre: user.nombre || 'Sistema',
          campo_afectado: field,
          valor_anterior: String((current as any)[field] || ''),
          valor_nuevo: String((dto as any)[field] || ''),
        });
      }
    }

    return this.prisma.atrasos.update({ where: { id }, data: dto });
  }

  async remove(user: any, id: number) {
    const current = await this.findOne(id);

    if (current.consolidado.vb_control_interno && ['CENTRO_SALUD', 'SECRETARIA'].includes(user.rol_enum)) {
      throw new ForbiddenException('Eliminación bloqueada: El consolidado ya está en revisión por Control Interno');
    }

    await this.auditService.createLog({
      tipo_modulo: 'ATRASO',
      registro_id: id,
      usuario_nombre: user.nombre || 'Sistema',
      campo_afectado: 'REGISTRO_ELIMINADO',
      valor_anterior: 'EXISTE',
      valor_nuevo: 'ELIMINADO',
    });

    return this.prisma.atrasos.delete({ where: { id } });
  }
}
