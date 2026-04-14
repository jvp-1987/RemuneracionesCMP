import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConsolidadoDto } from './dto/create-consolidado.dto';
import { UpdateConsolidadoDto } from './dto/update-consolidado.dto';

@Injectable()
export class ConsolidadosService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateConsolidadoDto) {
    return this.prisma.consolidado.create({ data: dto });
  }

  findAll() {
    return this.prisma.consolidado.findMany({
      include: { centro_salud: true, periodo: true, usuario_gestor: true },
    });
  }

  async findOne(id: number) {
    const consolidado = await this.prisma.consolidado.findUnique({
      where: { id },
      include: {
        centro_salud: true,
        periodo: true,
        usuario_gestor: true,
        horas_extras: { include: { funcionario: true, programa: true } },
        turnos_urgencia: { include: { funcionario: true } },
        viaticos: { include: { funcionario: true } },
        atrasos: { include: { funcionario: true } },
        procedimientos: { include: { funcionario: true } },
      },
    });

    if (!consolidado) throw new NotFoundException(`Consolidado #${id} no encontrado`);

    // --- Anomaly Detection: Find previous month data ---
    let prevMes = consolidado.periodo.mes - 1;
    let prevAnio = consolidado.periodo.anio;
    if (prevMes === 0) {
      prevMes = 12;
      prevAnio -= 1;
    }

    const prevPeriodo = await this.prisma.periodo.findFirst({
      where: { mes: prevMes, anio: prevAnio }
    });

    const prevConsolidado = prevPeriodo ? await this.prisma.consolidado.findFirst({
      where: {
        centro_salud_id: consolidado.centro_salud_id,
        periodo_id: prevPeriodo.id,
      },
      include: {
        horas_extras: true,
        viaticos: true,
        atrasos: true,
      },
    }) : null;

    // Aggregating historical data by RUT for the frontend
    const comparativa: Record<string, any> = {};
    if (prevConsolidado) {
      prevConsolidado.horas_extras.forEach(h => {
        if (!comparativa[h.funcionario_rut]) comparativa[h.funcionario_rut] = {};
        comparativa[h.funcionario_rut].cantidad_25_prev = Number(h.cantidad_25);
        comparativa[h.funcionario_rut].cantidad_50_prev = Number(h.cantidad_50);
      });
      prevConsolidado.viaticos.forEach(v => {
        if (!comparativa[v.funcionario_rut]) comparativa[v.funcionario_rut] = {};
        comparativa[v.funcionario_rut].viatico_monto_prev = Number(v.monto_calculado);
      });
      prevConsolidado.atrasos.forEach(a => {
        if (!comparativa[a.funcionario_rut]) comparativa[a.funcionario_rut] = {};
        comparativa[a.funcionario_rut].atraso_monto_prev = Number(a.monto_descuento);
      });
    }

    const escalas = await this.prisma.escalaHorasExtras.findMany({
      where: { anio: 2026 }
    });

    return {
      ...consolidado,
      comparativa,
      escalas,
    };
  }

  async update(id: number, dto: UpdateConsolidadoDto) {
    await this.findOne(id);
    
    // Auto-fill certification metadata if V°B° is being changed to true
    const updateData: any = { ...dto };
    
    if (dto.vb_control_interno === true) {
      updateData.fecha_vb_control_interno = new Date();
      updateData.firma_vb_control_interno = 'Dpto. Auditoría Interna - Panguipulli';
    } else if (dto.vb_control_interno === false) {
      updateData.fecha_vb_control_interno = null;
      updateData.firma_vb_control_interno = null;
    }

    if (dto.vb_finanzas === true) {
      updateData.fecha_vb_finanzas = new Date();
      updateData.firma_vb_finanzas = 'Dirección de Finanzas - Salud APS';
    } else if (dto.vb_finanzas === false) {
      updateData.fecha_vb_finanzas = null;
      updateData.firma_vb_finanzas = null;
    }

    return this.prisma.consolidado.update({ 
      where: { id }, 
      data: updateData 
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.consolidado.delete({ where: { id } });
  }
}
