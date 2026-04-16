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

  private normalizeEstablishment(name: string): string {
    const norm = this.normalizeString(name);
    if (norm.includes('choshuenco')) return 'CESFAM Choshuenco';
    if (norm.includes('conaripe')) return 'CESFAM Coñaripe';
    return 'CESFAM Panguipulli'; // Default or if panguipulli is found
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
    console.log(`rutIdx: ${rutIdx}`);
    const nomIdx = headers.findIndex((h: string) => h === 'nombre');
    const apeIdx = headers.findIndex((h: string) => h === 'apellido');
    const fullNomIdx = headers.findIndex((h: string) => h && (h.includes('nombre completo') || h === 'nombre'));
    const catIdx = headers.findIndex((h: string) => h === 'categoria' || h === 'categoria_aps');
    const nivIdx = headers.findIndex((h: string) => h === 'nivel' || h === 'nivel_aps');
    const estIdx = headers.findIndex((h: string) => h === 'establecimiento');
    const profIdx = headers.findIndex((h: string) => h && (h === 'titulo / especialidad' || h === 'profesion' || h === 'titulo_profesion'));

    const previewData: any[] = [];
    const existingFuncionarios = await this.prisma.funcionario.findMany();
    const existingMap = new Map(existingFuncionarios.map(f => [f.rut, f]));

    // Ensure main centers exist if not dryRun
    const centerMap = new Map<string, number>();
    if (!dryRun) {
      const mainNames = ['CESFAM Panguipulli', 'CESFAM Choshuenco', 'CESFAM Coñaripe'];
      for (const name of mainNames) {
        const c = await this.prisma.centroSalud.upsert({
          where: { id: mainNames.indexOf(name) + 1 },
          update: {},
          create: { id: mainNames.indexOf(name) + 1, nombre: name }
        });
        centerMap.set(name, c.id);
      }
    } else {
       // Just fake IDs for preview
       centerMap.set('CESFAM Panguipulli', 1);
       centerMap.set('CESFAM Choshuenco', 2);
       centerMap.set('CESFAM Coñaripe', 3);
    }

    for (const row of dataRows) {
      if (!row[rutIdx]) continue;
      const rawRut = String(row[rutIdx]).trim().replace(/\./g, '');
      const rut = rawRut.includes('-') ? rawRut.split('-')[0] : rawRut; // Store without DV for consistency if needed, or keep full
      
      let nombre = '';
      if (fullNomIdx !== -1) nombre = String(row[fullNomIdx] || '');
      else nombre = `${String(row[nomIdx] || '')} ${String(row[apeIdx] || '')}`.trim();

      const categoria = String(row[catIdx] || '').trim();
      const nivel = parseInt(row[nivIdx]) || null;
      const profesion = String(row[profIdx] || '').trim();
      const rawEst = String(row[estIdx] || '');
      const estNormalizado = this.normalizeEstablishment(rawEst);
      const centroId = centerMap.get(estNormalizado);

      const existing = existingMap.get(rut);
      const status = existing ? 'ACTUALIZADO' : 'NUEVO';
      
      const diff: any = {};
      if (existing) {
        if (existing.nombre_completo !== nombre) diff.nombre_completo = { old: existing.nombre_completo, new: nombre };
        if (existing.categoria_aps !== categoria) diff.categoria_aps = { old: existing.categoria_aps, new: categoria };
        if (existing.nivel_aps !== nivel) diff.nivel_aps = { old: existing.nivel_aps, new: nivel };
        if (existing.centro_salud_id !== centroId) diff.centro_salud_id = { old: existing.centro_salud_id, new: centroId, name: estNormalizado };
      }

      if (dryRun) {
        previewData.push({
          rut,
          nombre,
          categoria,
          nivel,
          profesion,
          establecimiento: estNormalizado,
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
            centro_salud_id: centroId
          },
          create: {
            rut,
            nombre_completo: nombre,
            profesion_enum: profesion || 'No Especificado',
            categoria_aps: categoria,
            nivel_aps: nivel,
            centro_salud_id: centroId
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
