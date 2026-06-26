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

    const updateData = { ...dto } as any;
    if (dto.observaciones !== undefined) {
      updateData.concepto = dto.observaciones;
      delete updateData.observaciones;
    }

    const fieldsToTrack = ['minutos', 'monto_descuento', 'estado', 'concepto', 'tiempo_descuento'];
    for (const field of fieldsToTrack) {
      if (updateData[field] !== undefined && String(updateData[field]) !== String((current as any)[field])) {
        await this.auditService.createLog({
          tipo_modulo: 'ATRASO',
          registro_id: id,
          usuario_nombre: user.nombre || 'Sistema',
          campo_afectado: field,
          valor_anterior: String((current as any)[field] || ''),
          valor_nuevo: String(updateData[field] || ''),
        });
      }
    }

    return this.prisma.atrasos.update({ where: { id }, data: updateData });
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

  async bulkUpdate(user: any, consolidadoId: number, dto: UpdateAtrasoDto) {
    const consolidado = await this.prisma.consolidado.findUnique({ where: { id: consolidadoId } });
    if (!consolidado) throw new NotFoundException(`Consolidado #${consolidadoId} no encontrado`);

    if (consolidado.vb_control_interno && ['CENTRO_SALUD', 'SECRETARIA'].includes(user.rol_enum)) {
      throw new ForbiddenException('Edición masiva bloqueada: El consolidado ya está en revisión por Control Interno');
    }

    const records = await this.prisma.atrasos.findMany({
      where: { consolidado_id: consolidadoId }
    });

    for (const record of records) {
      const fields = Object.keys(dto);
      const dataToUpdate: any = {};
      let hasUpdates = false;

      for (const field of fields) {
        if ((dto as any)[field] !== undefined && String((dto as any)[field]) !== String((record as any)[field])) {
          // Si es una actualización de estado, solo permitirla si el estado actual es PENDIENTE
          if (field === 'estado' && (record as any)[field] !== 'PENDIENTE') {
            continue;
          }

          dataToUpdate[field] = (dto as any)[field];
          hasUpdates = true;

          await this.auditService.createLog({
            tipo_modulo: 'ATRASO',
            registro_id: record.id,
            usuario_nombre: user.nombre || 'Sistema (Acción Masiva)',
            campo_afectado: field,
            valor_anterior: String((record as any)[field] || ''),
            valor_nuevo: String((dto as any)[field] || ''),
          });
        }
      }

      if (hasUpdates) {
        await this.prisma.atrasos.update({
          where: { id: record.id },
          data: dataToUpdate
        });
      }
    }

    return { message: 'Actualización masiva completada' };
  }
}
