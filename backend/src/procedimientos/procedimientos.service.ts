import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProcedimientoDto } from './dto/create-procedimiento.dto';
import { UpdateProcedimientoDto } from './dto/update-procedimiento.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ProcedimientosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  create(dto: CreateProcedimientoDto) {
    return this.prisma.procedimientos.create({ data: dto });
  }

  findAll() {
    return this.prisma.procedimientos.findMany({ include: { funcionario: true } });
  }

  async findOne(id: number) {
    const record = await this.prisma.procedimientos.findUnique({ 
      where: { id }, 
      include: { funcionario: true, consolidado: true } 
    });
    if (!record) throw new NotFoundException(`Procedimiento #${id} no encontrado`);
    return record;
  }

  async update(id: number, dto: UpdateProcedimientoDto, user?: any) {
    const oldData = await this.findOne(id);

    // Lock check
    if ((oldData.consolidado as any)?.vb_control_interno && ['CENTRO_SALUD', 'SECRETARIA'].includes(user?.rol_enum)) {
      throw new ForbiddenException('Edición bloqueada: El consolidado ya está en revisión por Control Interno');
    }

    const updated = await this.prisma.procedimientos.update({ where: { id }, data: dto });

    // Audit Log
    for (const key of Object.keys(dto)) {
      const oldVal = (oldData as any)[key];
      const newVal = (dto as any)[key];
      if (newVal !== undefined && String(oldVal ?? '') !== String(newVal ?? '')) {
        await this.audit.createLog({
          tipo_modulo: 'PROCEDIMIENTO',
          registro_id: id,
          usuario_nombre: user?.nombre || user?.sub || 'Sistema',
          campo_afectado: key,
          valor_anterior: String(oldVal ?? ''),
          valor_nuevo: String(newVal ?? ''),
        });
      }
    }

    return updated;
  }

  async remove(id: number, user?: any) {
    const current = await this.findOne(id);

    // Lock check
    if ((current.consolidado as any)?.vb_control_interno && ['CENTRO_SALUD', 'SECRETARIA'].includes(user?.rol_enum)) {
      throw new ForbiddenException('Eliminación bloqueada: El consolidado ya está en revisión por Control Interno');
    }

    await this.audit.createLog({
      tipo_modulo: 'PROCEDIMIENTO',
      registro_id: id,
      usuario_nombre: user?.nombre || user?.sub || 'Sistema',
      campo_afectado: 'REGISTRO_ELIMINADO',
      valor_anterior: 'EXISTE',
      valor_nuevo: 'ELIMINADO',
    });

    return this.prisma.procedimientos.delete({ where: { id } });
  }

  async bulkUpdate(consolidadoId: number, dto: UpdateProcedimientoDto, user: any) {
    const consolidado = await this.prisma.consolidado.findUnique({ where: { id: consolidadoId } });
    if (!consolidado) throw new NotFoundException(`Consolidado #${consolidadoId} no encontrado`);

    if ((consolidado as any).vb_control_interno && ['CENTRO_SALUD', 'SECRETARIA'].includes(user?.rol_enum)) {
      throw new ForbiddenException('Edición masiva bloqueada: El consolidado ya está en revisión por Control Interno');
    }

    const records = await this.prisma.procedimientos.findMany({
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

          await this.audit.createLog({
            tipo_modulo: 'PROCEDIMIENTO',
            registro_id: record.id,
            usuario_nombre: user?.nombre || user?.sub || 'Sistema (Acción Masiva)',
            campo_afectado: field,
            valor_anterior: String((record as any)[field] || ''),
            valor_nuevo: String((dto as any)[field] || ''),
          });
        }
      }

      if (hasUpdates) {
        await this.prisma.procedimientos.update({
          where: { id: record.id },
          data: dataToUpdate
        });
      }
    }

    return { message: 'Actualización masiva completada' };
  }
}
