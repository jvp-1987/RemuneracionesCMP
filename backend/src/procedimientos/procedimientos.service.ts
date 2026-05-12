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
    if (oldData.consolidado?.vb_control_interno && user?.rol === 'CENTRO_SALUD') {
      throw new ForbiddenException('Edición bloqueada: El consolidado ya está en revisión por Control Interno');
    }

    const updated = await this.prisma.procedimientos.update({ where: { id }, data: dto });

    // Audit Log
    for (const key of Object.keys(dto)) {
      if (oldData[key] !== dto[key]) {
        await this.audit.createLog(
          user?.sub || 0,
          user?.nombre || 'Sistema',
          'PROCEDIMIENTO',
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
    return this.prisma.procedimientos.delete({ where: { id } });
  }
}
