import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { CalculosService } from '../calculos/calculos.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFuncionarioDto } from './dto/create-funcionario.dto';
import { UpdateFuncionarioDto } from './dto/update-funcionario.dto';
import * as xlsx from 'xlsx';

@Injectable()
export class FuncionariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculosService: CalculosService,
  ) {}

  private normalizeRut(rut: string): string {
    if (!rut) return '';
    let clean = String(rut).replace(/\./g, '').replace(/-/g, '').trim().toUpperCase();
    clean = clean.replace(/^0+/, '');
    if (clean.length < 2) return clean;
    const dv = clean.slice(-1);
    const body = clean.slice(0, -1);
    return `${body}-${dv}`;
  }

  async create(dto: CreateFuncionarioDto) {
    dto.rut = this.normalizeRut(dto.rut);
    try {
      return await this.prisma.funcionario.create({ data: dto });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ConflictException('ALERTA DE FUNCIONARIO YA CREADO');
      }
      throw error;
    }
  }

  private normalizeString(str: string): string {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  private normalizeEstablishment(name: string): string {
    const norm = this.normalizeString(name);
    if (norm.includes('neltume') && !norm.includes('lago')) return 'CECOSF NELTUME';
    if (norm.includes('pireheuico') || norm.includes('pirihueico')) return 'POSTA RURAL PIREHEUICO';
    if (norm.includes('lago neltume')) return 'POSTA RURAL LAGONELTUME';
    if (norm.includes('choshuenco')) return 'CESFAM CHOSHUENCO';
    if (norm.includes('liquine')) return 'CECOSF LIQUIÑE';
    if (norm.includes('conaripe')) return 'CESFAM COÑARIPE';
    if (norm.includes('melefquen')) return 'POSTA RURAL MELEFQUEN';
    if (norm.includes('bocatoma')) return 'POSTA RURAL BOCATOMA';
    if (norm.includes('huitag')) return 'POSTA RURAL HUITAG';
    if (norm.includes('cayumapu')) return 'POSTA RURAL CAYUMAPU';
    if (norm.includes('sar')) return 'SAR PANGUIPULLI';
    
    // Centralized Admin
    if (norm.includes('personal') || norm.includes('rrhh')) return 'DEPARTAMENTO DE PERSONAL (RRHH)';
    if (norm.includes('farmacia')) return 'FARMACIA COMUNAL';
    if (norm.includes('central') || norm.includes('adm central') || norm.includes('depsa') || norm.includes('eleam')) {
      return 'CENTRAL';
    }

    return 'CESFAM PANGUIPULLI';
  }

  async importarExcel(buffer: Buffer, dryRun: boolean = false) {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    let headerRowIndex = -1;
    let sheetUsed = '';
    let rawData: any[][] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      rawData = xlsx.utils.sheet_to_json<any>(sheet, { header: 1 });
      headerRowIndex = rawData.findIndex(row => 
        Array.isArray(row) && row.some(c => {
          const s = String(c || '').toUpperCase();
          return s.includes('RUN') || s.includes('RUT');
        })
      );
      if (headerRowIndex !== -1) {
        sheetUsed = sheetName;
        break;
      }
    }

    if (headerRowIndex === -1) {
      throw new Error('No se encontró una columna RUN/RUT en ninguna hoja del archivo.');
    }

    const headerRow = rawData[headerRowIndex];
    const headers = headerRow.map((c: any) => this.normalizeString(String(c ?? '')));
    const dataRows = rawData.slice(headerRowIndex + 1);

    const rutIdx = headers.findIndex((h: string) => h && (h === 'run' || h === 'rut'));
    const nomIdx = headers.findIndex((h: string) => h === 'nombres' || h === 'nombre');
    const apeIdx = headers.findIndex((h: string) => h === 'apellidos' || h === 'apellido');
    const fullNomIdx = headers.findIndex((h: string) => h && (h.includes('nombre completo') || h === 'nombre' || h === 'full_name'));
    const catIdx = headers.findIndex((h: string) => h === 'categoria' || h === 'categoria_aps' || h === 'category');
    const nivIdx = headers.findIndex((h: string) => h === 'nivel' || h === 'nivel_aps' || h === 'current_level');
    const estIdx = headers.findIndex((h: string) => h === 'establecimiento' || h === 'department' || h === 'lugar de trabajo' || h === 'centro de costo' || h.includes('establecimiento'));
    
    let profIdx = headers.findIndex((h: string) => h === 'cargo' || h === 'position');
    if (profIdx === -1) {
      profIdx = headers.findIndex((h: string) => h && (h.includes('especialidad') || h.includes('profesion') || h === 'escalafon' || h === 'titulo / especialidad' || h === 'titulo_profesion'));
    }

    const hoursIdx = headers.findIndex((h: string) => h && (h === 'n°horas' || h === 'horas' || h === 'jornada' || h === 'jornada_horas' || h === 'weekly_hours'));

    const previewData: any[] = [];
    const existingFuncionarios = await this.prisma.funcionario.findMany();
    const existingMap = new Map(existingFuncionarios.map(f => [f.rut, f]));

    const centerMap = new Map<string, number>();
    const allCenters = await this.prisma.centroSalud.findMany();
    allCenters.forEach(c => centerMap.set(c.nombre.toUpperCase(), c.id));

    if (!dryRun && allCenters.length === 0) {
      const mainNames = ['CESFAM PANGUIPULLI', 'CESFAM CHOSHUENCO', 'CESFAM COÑARIPE'];
      for (const name of mainNames) {
        const c = await this.prisma.centroSalud.upsert({
          where: { id: mainNames.indexOf(name) + 1 },
          update: {},
          create: { id: mainNames.indexOf(name) + 1, nombre: name }
        });
        centerMap.set(name, c.id);
      }
    }

    const operations: any[] = [];
    for (const row of dataRows) {
      if (!row[rutIdx]) continue;
      const rut = this.normalizeRut(String(row[rutIdx]));
      
      let nombre = '';
      if (apeIdx !== -1 && nomIdx !== -1 && row[apeIdx] && row[nomIdx]) {
        nombre = `${String(row[nomIdx])} ${String(row[apeIdx])}`.trim();
      } else if (fullNomIdx !== -1) {
        nombre = String(row[fullNomIdx] || '').trim();
      }

      const categoria = String(row[catIdx] || '').trim();
      const nivel = parseInt(row[nivIdx]) || null;
      const profesion = String(row[profIdx] || '').trim();
      const jornada = parseInt(row[hoursIdx]) || 44;
      
      const rawEst = String(row[estIdx] || '');
      const estNormalizado = this.normalizeEstablishment(rawEst);
      let centroId = centerMap.get(estNormalizado);

      if (!centroId && rawEst && !dryRun) {
        throw new BadRequestException(`El establecimiento "${rawEst}" no existe en el sistema. Por favor créelo primero.`);
      }

      const existing = existingMap.get(rut);
      const status = existing ? 'ACTUALIZADO' : 'NUEVO';
      
      if (dryRun) {
        previewData.push({ rut, nombre, categoria, nivel, profesion, establecimiento: rawEst, status });
      } else {
        const data = {
          nombre_completo: nombre,
          categoria_aps: categoria,
          nivel_aps: nivel,
          jornada_horas: jornada,
          profesion_enum: profesion || 'No Especificado',
          centro_salud_id: centroId,
        };
        operations.push(this.prisma.funcionario.upsert({
          where: { rut },
          update: data,
          create: { rut, ...data }
        }));
      }
    }

    if (operations.length > 0) {
      await this.prisma.$transaction(operations);
    }

    return dryRun ? { dryRun: true, summary: { total: previewData.length }, previewData } : { message: 'Éxito', count: dataRows.length };
  }

  private async getCenterIds(centerId: number): Promise<number[]> {
    const center = await this.prisma.centroSalud.findUnique({
      where: { id: centerId },
      include: { dependientes: true }
    });
    if (!center) return [centerId];
    return [centerId, ...center.dependientes.map(d => d.id)];
  }

  async findAll(user: any, centroId?: number, includeInactive: boolean = false) {
    const isCentroSalud = ['CENTRO_SALUD', 'SECRETARIA'].includes(user.rol_enum);
    const where: any = {};
    
    if (!includeInactive) {
      where.activo = true;
    }

    if (centroId) {
      const ids = await this.getCenterIds(centroId);
      where.centro_salud_id = { in: ids };
    } else if (isCentroSalud && user.centro_salud_id) {
      const ids = await this.getCenterIds(user.centro_salud_id);
      where.centro_salud_id = { in: ids };
    }
    return this.prisma.funcionario.findMany({
      where,
      include: { centro_salud: true }
    });
  }

  async findOne(rut: string, user?: any) {
    const funcionario = await this.prisma.funcionario.findUnique({
      where: { rut },
      include: { 
        centro_salud: true,
        _count: { select: { atrasos: true, horas_extras: true, viaticos: true } },
        liquidaciones: {
          take: 24,
          orderBy: [{ periodo: { anio: 'desc' } }, { periodo: { mes: 'desc' } }],
          include: { periodo: true }
        },
        contratos: { orderBy: { fecha_inicio: 'desc' } },
        ausentismos: { orderBy: { fecha_inicio: 'desc' } },
        asignaciones: { orderBy: { fecha_inicio: 'desc' } },
        AsignacionFuncionario: { include: { catalogo: true }, orderBy: { fecha_inicio: 'desc' } }
      }
    });

    if (!funcionario) throw new NotFoundException(`Funcionario ${rut} no encontrado`);

    // Security Check
    if (user && ['CENTRO_SALUD', 'SECRETARIA'].includes(user.rol_enum) && user.centro_salud_id) {
      const ids = await this.getCenterIds(user.centro_salud_id);
      if (!funcionario.centro_salud_id || !ids.includes(funcionario.centro_salud_id)) {
        throw new NotFoundException(`Funcionario ${rut} no pertenece a su establecimiento ni dependientes`);
      }
    }

    const heBudget = await this.prisma.horasExtras.aggregate({
      where: { funcionario_rut: rut, estado_25: 'APROBADO', estado_50: 'APROBADO' },
      _sum: { monto_25: true, monto_50: true }
    });

    const atrasosBudget = await this.prisma.atrasos.aggregate({
      where: { funcionario_rut: rut, estado: 'APROBADO' },
      _sum: { monto_descuento: true }
    });

    let sueldo_base = 0;
    if (funcionario.categoria_aps && funcionario.nivel_aps) {
      const escala = await this.prisma.escalaSueldo.findUnique({
        where: { categoria_nivel: { categoria: funcionario.categoria_aps, nivel: funcionario.nivel_aps } }
      });
      if (escala) sueldo_base = Number(escala.sueldo_base);
    }

    const latestLiq = funcionario.liquidaciones[0];
    let remuneracion_presupuesto = await this.calculosService.obtenerDesgloseSueldo(rut);

    if (latestLiq && latestLiq.detalle_json) {
      const d = latestLiq.detalle_json as any;
      remuneracion_presupuesto = {
        ...remuneracion_presupuesto,
        porcentaje_zona: remuneracion_presupuesto?.porcentaje_zona || 0,
        porcentaje_dificil: remuneracion_presupuesto?.porcentaje_dificil || 0,
        total_base_mensual: remuneracion_presupuesto?.total_base_mensual || 0,
        valor_hora: remuneracion_presupuesto?.valor_hora || 0,
        is_real_data: true,
        escala_base: Number(latestLiq.sueldo_base),
        asignacion_aps: Number(d['ASIGNACION APS'] || d['ASIG. APS'] || d['APS'] || d['ATENCION PRIMARIA'] || d['ATEN. PRIMARIA'] || remuneracion_presupuesto?.asignacion_aps || 0),
        asignacion_zona: Number(d['ASIGNACION ZONA'] || d['ASIG. ZONA'] || d['ZONA'] || remuneracion_presupuesto?.asignacion_zona || 0),
        desempeno_dificil: Number(d['DESEMPEÑO DIFICIL'] || d['ASIG. DIFICIL'] || d['DIFICIL'] || remuneracion_presupuesto?.desempeno_dificil || 0),
      };
    }

    return {
      ...funcionario,
      sueldo_base: latestLiq ? Number(latestLiq.sueldo_base) : sueldo_base,
      remuneracion_presupuesto,
      stats: {
        total_atrasos: await this.prisma.atrasos.aggregate({
          where: { funcionario_rut: rut },
          _sum: { minutos: true }
        }).then(res => res._sum.minutos || 0),
        total_he: funcionario._count.horas_extras,
        total_viaticos: funcionario._count.viaticos,
        monto_he_presupuesto: Number(heBudget._sum.monto_25 || 0) + Number(heBudget._sum.monto_50 || 0),
        monto_atrasos_presupuesto: Number(atrasosBudget._sum.monto_descuento || 0),
        monto_he_real: latestLiq ? Number(latestLiq.monto_he_pagado) : 0,
        monto_he_25_maestro: latestLiq ? Number((latestLiq.detalle_json as any)['HORAS EXTRAS 25%'] || 0) : 0,
        monto_he_50_maestro: latestLiq ? Number((latestLiq.detalle_json as any)['HORAS EXTRAS 50%'] || 0) : 0,
        monto_atrasos_real: latestLiq ? Number(latestLiq.monto_atrasos_pagado) : 0,
        total_haberes_real: latestLiq ? Number(latestLiq.total_haberes) : 0,
        total_descuentos_real: latestLiq ? Number(latestLiq.total_descuentos) : 0,
        monto_liquido_real: latestLiq ? Number(latestLiq.monto_liquido) : 0,
        periodo_maestro: latestLiq?.periodo ? `${latestLiq.periodo.mes}/${latestLiq.periodo.anio}` : null
      }
    };
  }

  async update(rut: string, dto: UpdateFuncionarioDto) {
    return this.prisma.funcionario.update({ where: { rut }, data: dto });
  }

  async search(user: any, query: string, includeInactive: boolean = false) {
    const words = query.trim().split(/\s+/).filter(Boolean);
    const conditions = words.map(word => ({
      OR: [
        { rut: { contains: word } },
        { nombre_completo: { contains: word } }
      ]
    }));

    const where: any = {
      AND: conditions
    };
    
    if (!includeInactive) {
      where.activo = true;
    }

    if (['CENTRO_SALUD', 'SECRETARIA'].includes(user.rol_enum) && user.centro_salud_id) {
      const ids = await this.getCenterIds(user.centro_salud_id);
      where.centro_salud_id = { in: ids };
    }

    return this.prisma.funcionario.findMany({
      where,
      take: 5,
      select: { rut: true, nombre_completo: true, categoria_aps: true, nivel_aps: true, activo: true }
    });
  }

  async remove(rut: string) {
    return this.prisma.funcionario.delete({ where: { rut } });
  }
}
