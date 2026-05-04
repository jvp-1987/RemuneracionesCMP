import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFuncionarioDto } from './dto/create-funcionario.dto';
import { UpdateFuncionarioDto } from './dto/update-funcionario.dto';
import * as xlsx from 'xlsx';

@Injectable()
export class FuncionariosService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateFuncionarioDto) {
    return this.prisma.funcionario.create({ data: dto });
  }

  private normalizeString(str: string): string {
    if (!str) return '';
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }


  async importarExcel(buffer: Buffer, dryRun: boolean = false) {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    let headerRowIndex = -1;
    let sheetUsed = '';
    let rawData: any[][] = [];

    // Search through all sheets for the master list
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
    console.log(`Using sheet: ${sheetUsed} at row ${headerRowIndex}`);
    const headers = headerRow.map((c: any) => this.normalizeString(String(c ?? '')));
    console.log('Detected Headers:', headers);
    
    const dataRows = rawData.slice(headerRowIndex + 1);
    console.log(`Processing ${dataRows.length} data rows...`);

    const rutIdx = headers.findIndex((h: string) => h && (h === 'run' || h === 'rut'));
    const nomIdx = headers.findIndex((h: string) => h === 'nombres' || h === 'nombre');
    const apeIdx = headers.findIndex((h: string) => h === 'apellidos' || h === 'apellido');
    const fullNomIdx = headers.findIndex((h: string) => h && (h.includes('nombre completo') || h === 'nombre'));
    const catIdx = headers.findIndex((h: string) => h === 'categoria' || h === 'categoria_aps');
    const nivIdx = headers.findIndex((h: string) => h === 'nivel' || h === 'nivel_aps');
    const estIdx = headers.findIndex((h: string) => h === 'establecimiento');
    
    // Priorizar columna CARGO exacta
    let profIdx = headers.findIndex((h: string) => h === 'cargo');
    if (profIdx === -1) {
      profIdx = headers.findIndex((h: string) => h && (h.includes('especialidad') || h.includes('profesion') || h === 'escalafon'));
    }

    const horasIdx = headers.findIndex((h: string) => h && (h === 'n°horas' || h === 'horas' || h === 'jornada'));

    const previewData: any[] = [];
    const existingFuncionarios = await this.prisma.funcionario.findMany();
    const existingMap = new Map(existingFuncionarios.map(f => [f.rut, f]));

    // Cargar Centros de Salud existentes desde la DB
    const existingCentros = await this.prisma.centroSalud.findMany();
    const centerMap = new Map<string, number>();
    existingCentros.forEach(c => centerMap.set(c.nombre.trim().toLowerCase(), c.id));

    for (const row of dataRows) {
      if (!row[rutIdx]) continue;
      const rawRut = String(row[rutIdx]).trim();
      // Estandarizamos el RUT: sin puntos y siempre en mayúscula
      const rut = rawRut.replace(/\./g, '').toUpperCase(); 
      
      // Autocorrección: Eliminar el registro antiguo (el que se guardó sin guión por el bug anterior)
      const oldRutBuggy = rut.includes('-') ? rut.split('-')[0] : null;
      if (oldRutBuggy && !dryRun) {
        try {
          await this.prisma.funcionario.deleteMany({ where: { rut: oldRutBuggy } });
        } catch (e) {
          // Ignorar si no existe
        }
      }

      let nombre = '';
      if (apeIdx !== -1 && nomIdx !== -1 && row[apeIdx] && row[nomIdx]) {
        nombre = `${String(row[nomIdx])} ${String(row[apeIdx])}`.trim();
      } else if (fullNomIdx !== -1) {
        nombre = String(row[fullNomIdx] || '').trim();
      }

      const categoria = String(row[catIdx] || '').trim();
      const nivel = parseInt(row[nivIdx]) || null;
      const profesion = String(row[profIdx] || '').trim();
      const horas = horasIdx !== -1 ? parseInt(row[horasIdx]) || 44 : 44;
      
      const rawEst = String(row[estIdx] || '').trim();
      let centroId = centerMap.get(rawEst.toLowerCase());

      // Crear centro si no existe y no es dryRun
      if (!centroId && rawEst && !dryRun) {
        const newCentro = await this.prisma.centroSalud.create({ data: { nombre: rawEst } });
        centroId = newCentro.id;
        centerMap.set(rawEst.toLowerCase(), newCentro.id);
      } else if (!centroId && rawEst && dryRun) {
        // ID ficticio para preview
        centroId = 999;
      }

      const existing = existingMap.get(rut);
      const status = existing ? 'ACTUALIZADO' : 'NUEVO';
      
      const diff: any = {};
      if (existing) {
        if (existing.nombre_completo !== nombre) diff.nombre_completo = { old: existing.nombre_completo, new: nombre };
        if (existing.categoria_aps !== categoria) diff.categoria_aps = { old: existing.categoria_aps, new: categoria };
        if (existing.nivel_aps !== nivel) diff.nivel_aps = { old: existing.nivel_aps, new: nivel };
        if (existing.centro_salud_id !== centroId) diff.centro_salud_id = { old: existing.centro_salud_id, new: centroId, name: rawEst };
      }

      if (dryRun) {
        previewData.push({
          rut,
          nombre,
          categoria,
          nivel,
          profesion,
          establecimiento: rawEst,
          status,
          hasChanges: Object.keys(diff).length > 0,
          diff
        });
      } else {
        await this.prisma.funcionario.upsert({
          where: { rut },
          update: {
            nombre_completo: nombre,
            categoria_aps: categoria,
            nivel_aps: nivel,
            profesion_enum: profesion || 'No Especificado',
            centro_salud_id: centroId,
            jornada_horas: horas
          },
          create: {
            rut,
            nombre_completo: nombre,
            profesion_enum: profesion || 'No Especificado',
            categoria_aps: categoria,
            nivel_aps: nivel,
            centro_salud_id: centroId,
            jornada_horas: horas
          }
        });
      }
    }

    if (dryRun) {
      // Group by establishment
      const grouped: Record<string, any[]> = {
        'CESFAM Panguipulli': [],
        'CESFAM Choshuenco': [],
        'CESFAM Coñaripe': []
      };
      previewData.forEach(p => {
        if (grouped[p.establecimiento]) grouped[p.establecimiento].push(p);
      });

      return {
        dryRun: true,
        summary: {
          total: previewData.length,
          nuevos: previewData.filter(p => p.status === 'NUEVO').length,
          actualizados: previewData.filter(p => p.status === 'ACTUALIZADO' && p.hasChanges).length
        },
        grouped
      };
    }

    return {
      message: 'Sincronización procesada con éxito.',
      count: dataRows.length
    };
  }

  findAll() {
    return this.prisma.funcionario.findMany({
      include: { centro_salud: true }
    });
  }

  async findOne(rut: string) {
    const funcionario = await this.prisma.funcionario.findUnique({
      where: { rut },
      include: { centro_salud: true }
    });
    if (!funcionario) throw new NotFoundException(`Funcionario ${rut} no encontrado`);
    return funcionario;
  }

  async update(rut: string, dto: UpdateFuncionarioDto) {
    return this.prisma.funcionario.update({ where: { rut }, data: dto });
  }

  async search(query: string) {
    return this.prisma.funcionario.findMany({
      where: {
        OR: [
          { rut: { contains: query } },
          { nombre_completo: { contains: query } }
        ]
      },
      take: 5,
      select: { rut: true, nombre_completo: true, categoria_aps: true, nivel_aps: true }
    });
  }

  async remove(rut: string) {
    return this.prisma.funcionario.delete({ where: { rut } });
  }
}
