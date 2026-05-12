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
    if (oldData.consolidado?.vb_control_interno && user?.rol === 'CENTRO_SALUD') {
      throw new ForbiddenException('Edición bloqueada: El consolidado ya está en revisión por Control Interno');
    }

    const updated = await this.prisma.turnosUrgencia.update({ where: { id }, data: dto });

    // Audit Log
    for (const key of Object.keys(dto)) {
      if (oldData[key] !== dto[key]) {
        await this.audit.createLog(
          user?.sub || 0,
          user?.nombre || 'Sistema',
          'TURNO_URGENCIA',
          id,
          key,
          String(oldData[key]),
          String(dto[key]),
        );
      }
    }

    return updated;
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.turnosUrgencia.delete({ where: { id } });
  }
}
