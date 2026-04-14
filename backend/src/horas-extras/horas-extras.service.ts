import { Injectable, NotFoundException } from '@nestjs/common';
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

  async update(id: number, dto: UpdateHorasExtrasDto) {
    const current = await this.findOne(id);
    
    // Check for changes and log them
    const fieldsToTrack = ['estado_25', 'estado_50', 'observaciones_25', 'observaciones_50'];
    for (const field of fieldsToTrack) {
      if ((dto as any)[field] !== undefined && (dto as any)[field] !== (current as any)[field]) {
        await this.auditService.createLog({
          tipo_modulo: 'HE',
          registro_id: id,
          usuario_nombre: 'Administrador RRHH',
          campo_afectado: field,
          valor_anterior: String((current as any)[field] || ''),
          valor_nuevo: String((dto as any)[field] || ''),
        });
      }
    }

    return this.prisma.horasExtras.update({ where: { id }, data: dto });
  }

  async bulkUpdate(consolidadoId: number, dto: UpdateHorasExtrasDto) {
    // For bulk updates, we also want to log the change for each record
    // We'll fetch the IDs first to create individual logs
    const records = await this.prisma.horasExtras.findMany({
      where: { consolidado_id: consolidadoId }
    });

    for (const record of records) {
      const fields = Object.keys(dto);
      for (const field of fields) {
        if ((dto as any)[field] !== undefined && (dto as any)[field] !== (record as any)[field]) {
          await this.auditService.createLog({
            tipo_modulo: 'HE',
            registro_id: record.id,
            usuario_nombre: 'Administrador RRHH (Acción Masiva)',
            campo_afectado: field,
            valor_anterior: String((record as any)[field] || ''),
            valor_nuevo: String((dto as any)[field] || ''),
          });
        }
      }
    }

    return this.prisma.horasExtras.updateMany({
      where: {
        consolidado_id: consolidadoId,
      },
      data: dto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.horasExtras.delete({ where: { id } });
  }
}
