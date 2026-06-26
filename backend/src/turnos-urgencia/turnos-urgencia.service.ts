import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTurnoUrgenciaDto } from './dto/create-turno-urgencia.dto';
import { UpdateTurnoUrgenciaDto } from './dto/update-turno-urgencia.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class TurnosUrgenciaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  create(dto: CreateTurnoUrgenciaDto) {
    return this.prisma.turnosUrgencia.create({ data: dto });
  }

  findAll() {
    return this.prisma.turnosUrgencia.findMany({ include: { funcionario: true } });
  }

  async findOne(id: number) {
    const record = await this.prisma.turnosUrgencia.findUnique({ 
      where: { id }, 
      include: { funcionario: true, consolidado: true } 
    });
    if (!record) throw new NotFoundException(`Turno Urgencia #${id} no encontrado`);
    return record;
  }

  async update(id: number, dto: UpdateTurnoUrgenciaDto, user?: any) {
    const oldData = await this.findOne(id);

    // Lock check
    if ((oldData.consolidado as any)?.vb_control_interno && ['CENTRO_SALUD', 'SECRETARIA'].includes(user?.rol_enum)) {
      throw new ForbiddenException('Edición bloqueada: El consolidado ya está en revisión por Control Interno');
    }

    let updatedDto = { ...dto } as any;

    // Recalcular monto_calculado si se cambian las cantidades
    if (updatedDto.cant_turnos_habiles !== undefined || updatedDto.cant_turnos_inhabiles !== undefined) {
      const habiles = updatedDto.cant_turnos_habiles !== undefined ? Number(updatedDto.cant_turnos_habiles) : Number(oldData.cant_turnos_habiles || 0);
      const inhabiles = updatedDto.cant_turnos_inhabiles !== undefined ? Number(updatedDto.cant_turnos_inhabiles) : Number(oldData.cant_turnos_inhabiles || 0);
      const valorHabil = Number(oldData.valor_habil || 0);
      const valorInhabil = Number(oldData.valor_inhabil || 0);
      
      updatedDto.monto_calculado = (habiles * valorHabil) + (inhabiles * valorInhabil);
    }

    const updated = await this.prisma.turnosUrgencia.update({ where: { id }, data: updatedDto });

    // Audit Log
    for (const key of Object.keys(updatedDto)) {
      const oldVal = (oldData as any)[key];
      const newVal = (updatedDto as any)[key];
      if (newVal !== undefined && String(oldVal ?? '') !== String(newVal ?? '')) {
        await this.audit.createLog({
          tipo_modulo: 'TURNO_URGENCIA',
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
      tipo_modulo: 'TURNO_URGENCIA',
      registro_id: id,
      usuario_nombre: user?.nombre || user?.sub || 'Sistema',
      campo_afectado: 'REGISTRO_ELIMINADO',
      valor_anterior: 'EXISTE',
      valor_nuevo: 'ELIMINADO',
    });

    return this.prisma.turnosUrgencia.delete({ where: { id } });
  }

  async bulkUpdate(consolidadoId: number, dto: UpdateTurnoUrgenciaDto, user: any) {
    const consolidado = await this.prisma.consolidado.findUnique({ where: { id: consolidadoId } });
    if (!consolidado) throw new NotFoundException(`Consolidado #${consolidadoId} no encontrado`);

    if ((consolidado as any).vb_control_interno && ['CENTRO_SALUD', 'SECRETARIA'].includes(user?.rol_enum)) {
      throw new ForbiddenException('Edición masiva bloqueada: El consolidado ya está en revisión por Control Interno');
    }

    const records = await this.prisma.turnosUrgencia.findMany({
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
            tipo_modulo: 'TURNO_URGENCIA',
            registro_id: record.id,
            usuario_nombre: user?.nombre || user?.sub || 'Sistema (Acción Masiva)',
            campo_afectado: field,
            valor_anterior: String((record as any)[field] || ''),
            valor_nuevo: String((dto as any)[field] || ''),
          });
        }
      }

      if (hasUpdates) {
        await this.prisma.turnosUrgencia.update({
          where: { id: record.id },
          data: dataToUpdate
        });
      }
    }

    return { message: 'Actualización masiva completada' };
  }
}
