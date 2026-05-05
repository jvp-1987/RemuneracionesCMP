import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePeriodoDto } from './dto/create-periodo.dto';
import { UpdatePeriodoDto } from './dto/update-periodo.dto';

@Injectable()
export class PeriodosService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreatePeriodoDto) {
    return this.prisma.periodo.create({ data: dto });
  }

  async seedYear(anio: number) {
    const existing = await this.prisma.periodo.findMany({ where: { anio } });
    const existingMeses = existing.map(p => p.mes);
    
    const created = [];
    for (let mes = 1; mes <= 12; mes++) {
      if (!existingMeses.includes(mes)) {
        const p = await this.prisma.periodo.create({
          data: { mes, anio, estado: 'Abierto' }
        });
        created.push(p);
      }
    }
    return { created: created.length, year: anio };
  }

  async getDetailedStatus() {
    const periodos = await this.prisma.periodo.findMany({
      orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
      include: {
        _count: {
          select: {
            liquidaciones: true,
            consolidados: true
          }
        },
        consolidados: {
          select: {
            vb_control_interno: true,
            vb_finanzas: true
          }
        }
      }
    });

    return periodos.map(p => {
      const totalConsolidados = p._count.consolidados;
      const totalVbs = p.consolidados.reduce((acc, c) => {
        return acc + (c.vb_control_interno && c.vb_finanzas ? 1 : 0);
      }, 0);

      return {
        id: p.id,
        mes: p.mes,
        anio: p.anio,
        estado: p.estado,
        hasMaestro: p._count.liquidaciones > 0,
        maestroCount: p._count.liquidaciones,
        auditProgress: totalConsolidados > 0 ? Math.round((totalVbs / totalConsolidados) * 100) : 0,
        isClosed: p.estado === 'Cerrado'
      };
    });
  }

  async findAll() {
    return this.prisma.periodo.findMany({ orderBy: [{ anio: 'desc' }, { mes: 'desc' }] });
  }

  async findOne(id: number) {
    const periodo = await this.prisma.periodo.findUnique({ where: { id } });
    if (!periodo) throw new NotFoundException(`Periodo #${id} no encontrado`);
    return periodo;
  }

  async update(id: number, dto: UpdatePeriodoDto) {
    await this.findOne(id);
    return this.prisma.periodo.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.periodo.delete({ where: { id } });
  }
}
