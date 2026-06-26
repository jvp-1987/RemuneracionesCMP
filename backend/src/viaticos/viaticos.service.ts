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

    if (current.consolidado.vb_control_interno && ['CENTRO_SALUD', 'SECRETARIA'].includes(user.rol_enum)) {
      throw new ForbiddenException('Edición bloqueada: El consolidado ya está en revisión por Control Interno');
    }

    const updateData = { ...dto } as any;
    if (dto.observaciones !== undefined) {
      updateData.justificacion = dto.observaciones;
      delete updateData.observaciones;
    }

    const fieldsToTrack = ['monto_calculado', 'rendicion_pasajes', 'tipo_destino', 'estado', 'justificacion', 'concepto'];
    for (const field of fieldsToTrack) {
      if (updateData[field] !== undefined && String(updateData[field]) !== String((current as any)[field])) {
        await this.auditService.createLog({
          tipo_modulo: 'VIATICO',
          registro_id: id,
          usuario_nombre: user.nombre || 'Sistema',
          campo_afectado: field,
          valor_anterior: String((current as any)[field] || ''),
          valor_nuevo: String(updateData[field] || ''),
        });
      }
    }

    return this.prisma.viaticos.update({ where: { id }, data: updateData });
  }

  async remove(user: any, id: number) {
    const current = await this.findOne(id);

    if (current.consolidado.vb_control_interno && ['CENTRO_SALUD', 'SECRETARIA'].includes(user.rol_enum)) {
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

  async bulkUpdate(user: any, consolidadoId: number, dto: UpdateViaticoDto) {
    const consolidado = await this.prisma.consolidado.findUnique({ where: { id: consolidadoId } });
    if (!consolidado) throw new NotFoundException(`Consolidado #${consolidadoId} no encontrado`);

    if (consolidado.vb_control_interno && ['CENTRO_SALUD', 'SECRETARIA'].includes(user.rol_enum)) {
      throw new ForbiddenException('Edición masiva bloqueada: El consolidado ya está en revisión por Control Interno');
    }

    const records = await this.prisma.viaticos.findMany({
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
            tipo_modulo: 'VIATICO',
            registro_id: record.id,
            usuario_nombre: user.nombre || 'Sistema (Acción Masiva)',
            campo_afectado: field,
            valor_anterior: String((record as any)[field] || ''),
            valor_nuevo: String((dto as any)[field] || ''),
          });
        }
      }

      if (hasUpdates) {
        await this.prisma.viaticos.update({
          where: { id: record.id },
          data: dataToUpdate
        });
      }
    }

    return { message: 'Actualización masiva completada' };
  }
}
