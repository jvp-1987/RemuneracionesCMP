import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHorasExtrasDto } from './dto/create-horas-extras.dto';
import { UpdateHorasExtrasDto } from './dto/update-horas-extras.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class HorasExtrasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  create(dto: CreateHorasExtrasDto) {
    return this.prisma.horasExtras.create({ data: dto });
  }

  findAll() {
    return this.prisma.horasExtras.findMany({ include: { funcionario: true, programa: true } });
  }

  findByConsolidado(consolidadoId: number) {
    return this.prisma.horasExtras.findMany({
      where: { consolidado_id: consolidadoId },
      include: { funcionario: true, programa: true },
    });
  }

  async findOne(id: number) {
    const record = await this.prisma.horasExtras.findUnique({ where: { id }, include: { funcionario: true, programa: true } });
    if (!record) throw new NotFoundException(`Horas Extras #${id} no encontrada`);
    return record;
  }

  async update(user: any, id: number, dto: UpdateHorasExtrasDto) {
    const current = await this.prisma.horasExtras.findUnique({
      where: { id },
      include: { consolidado: true }
    });
    if (!current) throw new NotFoundException(`Horas Extras #${id} no encontrada`);

    // Lock check: If reviewed by Control Interno and user is CENTRO_SALUD, block editing
    if (current.consolidado.vb_control_interno && ['CENTRO_SALUD', 'SECRETARIA'].includes(user.rol_enum)) {
      throw new ForbiddenException('Edición bloqueada: El consolidado ya está en revisión por Control Interno');
    }
    
    // Check for changes and log them
    const fieldsToTrack = ['cantidad_25', 'cantidad_50', 'monto_25', 'monto_50', 'estado_25', 'estado_50', 'observaciones_25', 'observaciones_50', 'programa_id'];
    for (const field of fieldsToTrack) {
      if ((dto as any)[field] !== undefined && String((dto as any)[field]) !== String((current as any)[field])) {
        await this.auditService.createLog({
          tipo_modulo: 'HE',
          registro_id: id,
          usuario_nombre: user.nombre || 'Sistema',
          campo_afectado: field,
          valor_anterior: String((current as any)[field] || ''),
          valor_nuevo: String((dto as any)[field] || ''),
        });
      }
    }

    return this.prisma.horasExtras.update({ where: { id }, data: dto });
  }

  async bulkUpdate(user: any, consolidadoId: number, dto: UpdateHorasExtrasDto) {
    const consolidado = await this.prisma.consolidado.findUnique({ where: { id: consolidadoId } });
    if (!consolidado) throw new NotFoundException(`Consolidado #${consolidadoId} no encontrado`);

    if (consolidado.vb_control_interno && ['CENTRO_SALUD', 'SECRETARIA'].includes(user.rol_enum)) {
      throw new ForbiddenException('Edición masiva bloqueada: El consolidado ya está en revisión por Control Interno');
    }

    const records = await this.prisma.horasExtras.findMany({
      where: { consolidado_id: consolidadoId }
    });

    for (const record of records) {
      const fields = Object.keys(dto);
      const dataToUpdate: any = {};
      let hasUpdates = false;

      for (const field of fields) {
        if ((dto as any)[field] !== undefined && String((dto as any)[field]) !== String((record as any)[field])) {
          // Si es una actualización de estado, solo permitirla si el estado actual es PENDIENTE
          if ((field === 'estado_25' || field === 'estado_50' || field === 'estado') && (record as any)[field] !== 'PENDIENTE') {
            continue;
          }

          dataToUpdate[field] = (dto as any)[field];
          hasUpdates = true;

          await this.auditService.createLog({
            tipo_modulo: 'HE',
            registro_id: record.id,
            usuario_nombre: user.nombre || 'Sistema (Acción Masiva)',
            campo_afectado: field,
            valor_anterior: String((record as any)[field] || ''),
            valor_nuevo: String((dto as any)[field] || ''),
          });
        }
      }

      if (hasUpdates) {
        await this.prisma.horasExtras.update({
          where: { id: record.id },
          data: dataToUpdate
        });
      }
    }

    return { message: 'Actualización masiva completada' };
  }

  async remove(user: any, id: number) {
    const current = await this.prisma.horasExtras.findUnique({
      where: { id },
      include: { consolidado: true }
    });
    if (!current) throw new NotFoundException(`Horas Extras #${id} no encontrada`);

    // Lock check
    if (current.consolidado.vb_control_interno && ['CENTRO_SALUD', 'SECRETARIA'].includes(user.rol_enum)) {
      throw new ForbiddenException('Eliminación bloqueada: El consolidado ya está en revisión por Control Interno');
    }

    // Audit Log for deletion
    await this.auditService.createLog({
      tipo_modulo: 'HE',
      registro_id: id,
      usuario_nombre: user.nombre || 'Sistema',
      campo_afectado: 'REGISTRO_ELIMINADO',
      valor_anterior: 'EXISTE',
      valor_nuevo: 'ELIMINADO',
    });

    return this.prisma.horasExtras.delete({ where: { id } });
  }
}
