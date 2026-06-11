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

    const updated = await this.prisma.turnosUrgencia.update({ where: { id }, data: dto });

    // Audit Log
    for (const key of Object.keys(dto)) {
      const oldVal = (oldData as any)[key];
      const newVal = (dto as any)[key];
      if (oldVal !== newVal) {
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
}
