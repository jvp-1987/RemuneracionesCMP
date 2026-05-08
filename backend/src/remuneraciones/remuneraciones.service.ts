import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as xlsx from 'xlsx';

@Injectable()
export class RemuneracionesService {
  constructor(private prisma: PrismaService) {}

  private normalizeRut(rut: any): string | null {
    if (!rut) return null;
    let str = String(rut).trim().toUpperCase();
    // Eliminar puntos si existen
    str = str.replace(/\./g, '');
    // Eliminar ceros iniciales
    str = str.replace(/^0+/, '');
    return str;
  }

  async importarMaestroMensual(buffer: Buffer, periodoId: number, dryRun: boolean = false) {
    // Verificar si el periodo está cerrado
    const periodo = await this.prisma.periodo.findUnique({ where: { id: +periodoId } });
    if (periodo?.estado === 'Cerrado' && !dryRun) {
      throw new BadRequestException(`El periodo ${periodo.mes}/${periodo.anio} está CERRADO. No se pueden importar nuevos maestros.`);
    }

    const workbook = xlsx.read(buffer, { type: 'buffer' });
    
    const sheetNames = workbook.SheetNames;
    const findSheet = (name: string) => {
      const search = name.toLowerCase().trim();
      const actualName = sheetNames.find(sn => sn.toLowerCase().trim() === search);
      return actualName ? workbook.Sheets[actualName] : null;
    };

    const sheetGenerales = findSheet('datos generales');
    const sheetHaberes = findSheet('haberes');
    const sheetDescuentos = findSheet('descuentos') || findSheet('descuento');

    if (!sheetHaberes || !sheetDescuentos) {
      throw new BadRequestException(`El archivo Maestro debe contener al menos las hojas "Haberes" y "Descuentos" (o "Descuento"). Se detectaron: ${sheetNames.join(', ')}`);
    }

    const dataGenerales = sheetGenerales ? xlsx.utils.sheet_to_json(sheetGenerales) : [];
    const dataHaberes = xlsx.utils.sheet_to_json(sheetHaberes);
    const dataDescuentos = xlsx.utils.sheet_to_json(sheetDescuentos);
    
    const consolidadoMap = new Map<string, any>();

    // 1. Procesar Datos Generales (Metadata Maestra)
    for (const row of dataGenerales as any[]) {
      const rut = this.normalizeRut(row['RUT'] || row['RUN']);
      if (!rut) continue;

      const nombreLargo = row['NOMBRE COMPLETO'] || `${row['NOMBRES'] || ''} ${row['APELLIDOS'] || ''}`.trim();
      
      if (!dryRun) {
        await this.prisma.funcionario.upsert({
          where: { rut },
          update: {
            nombre_completo: nombreLargo || undefined,
            categoria_aps: row['CATEGORIA APS'] || row['CATEGORIA'] || undefined,
            nivel_aps: row['NIVEL APS'] || row['NIVEL'] ? +(row['NIVEL APS'] || row['NIVEL']) : undefined,
            jornada_horas: row['JORNADA HRS'] || row['JORNADA'] ? +(row['JORNADA HRS'] || row['JORNADA']) : undefined,
            fecha_nacimiento: row['FECHA NACIMIENTO'] ? new Date(row['FECHA NACIMIENTO']) : undefined,
          },
          create: {
            rut,
            nombre_completo: nombreLargo || 'Sin Nombre',
            categoria_aps: row['CATEGORIA APS'] || row['CATEGORIA'] || 'Z',
            nivel_aps: row['NIVEL APS'] || row['NIVEL'] ? +(row['NIVEL APS'] || row['NIVEL']) : 15,
            profesion_enum: 'OTROS',
          }
        });
      }

      consolidadoMap.set(rut, {
        rut,
        nombre: nombreLargo,
        detalle: { ...row }
      });
    }

    // 2. Procesar Haberes (Sincronizar datos si no estaban en Generales)
    for (const row of dataHaberes as any[]) {
      const rawRut = row['RUT'];
      const rut = this.normalizeRut(rawRut);
      if (!rut) continue;

      const nombreLargo = `${row['NOMBRES'] || ''} ${row['APELLIDOS'] || ''}`.trim();
      
      if (!dryRun && !consolidadoMap.has(rut)) {
        await this.prisma.funcionario.upsert({
          where: { rut },
          update: {
            nombre_completo: nombreLargo || undefined,
            categoria_aps: row['CATEGORIA APS'] || undefined,
            nivel_aps: row['NIVEL APS'] ? +row['NIVEL APS'] : undefined,
            jornada_horas: row['JORNADA HRS'] ? +row['JORNADA HRS'] : undefined,
          },
          create: {
            rut,
            nombre_completo: nombreLargo || 'Sin Nombre',
            categoria_aps: row['CATEGORIA APS'] || 'Z',
            nivel_aps: row['NIVEL APS'] ? +row['NIVEL APS'] : 15,
            profesion_enum: 'OTROS',
          }
        });
      }

      const existing = consolidadoMap.get(rut) || { rut, nombre: nombreLargo, detalle: {} };
      
      consolidadoMap.set(rut, {
        ...existing,
        originalRut: rawRut,
        sueldo_base: Number(row['SUELDO BASE'] || 0),
        total_haberes: Number(row['TOTAL HABERES'] || 0),
        monto_he_pagado: Number(row['HORAS EXTRAS 25%'] || 0) + Number(row['HORAS EXTRAS 50%'] || 0),
        monto_aps: Number(row['ASIGNACION APS'] || row['ASIG. APS'] || row['APS'] || 0),
        monto_zona: Number(row['ASIGNACION ZONA'] || row['ASIG. ZONA'] || row['ZONA'] || 0),
        monto_dificil: Number(row['DESEMPEÑO DIFICIL'] || row['ASIG. DIFICIL'] || row['DIFICIL'] || 0),
        detalle: { ...existing.detalle, ...row }
      });
    }

    // 3. Procesar Descuentos
    dataDescuentos.forEach((row: any) => {
      const rut = this.normalizeRut(row['RUT']);
      if (!rut || !consolidadoMap.has(rut)) return;

      const current = consolidadoMap.get(rut);
      current.total_descuentos = Number(row['TOTAL DESCUENTOS LEGALES'] || 0) + Number(row['TOTAL DESCUENTOS VARIOS'] || 0);
      current.monto_liquido = (current.total_haberes || 0) - (current.total_descuentos || 0);
      current.monto_atrasos_pagado = Number(row['5-HORAS DE ATRASOS'] || 0);
      current.detalle = { ...current.detalle, ...row };
    });

    const ruts = Array.from(consolidadoMap.keys());
    const existingLiquidaciones = await this.prisma.liquidacionMensual.findMany({
      where: {
        funcionario_rut: { in: ruts },
        periodo_id: +periodoId
      }
    });
    const existingMap = new Map(existingLiquidaciones.map(l => [l.funcionario_rut, l.id]));

    const entriesArray = Array.from(consolidadoMap.entries());
    const batchSize = 100;
    let countTotal = 0;
    const maestroPreviewBatch = [];

    for (let i = 0; i < entriesArray.length; i += batchSize) {
      const batch = entriesArray.slice(i, i + batchSize);
      
      if (!dryRun) {
        await this.prisma.$transaction(
          batch.map(([rut, data]) => {
            const liquidacionId = existingMap.get(rut);
            const payload = {
              sueldo_base: data.sueldo_base,
              total_haberes: data.total_haberes,
              total_descuentos: data.total_descuentos || 0,
              monto_liquido: data.monto_liquido || 0,
              monto_he_pagado: data.monto_he_pagado,
              monto_atrasos_pagado: data.monto_atrasos_pagado || 0,
              detalle_json: {
                ...data.detalle,
                calculated_monto_aps: data.monto_aps,
                calculated_monto_zona: data.monto_zona,
                calculated_monto_dificil: data.monto_dificil
              }
            };

            if (liquidacionId) {
              return this.prisma.liquidacionMensual.update({
                where: { id: liquidacionId },
                data: payload
              });
            } else {
              return this.prisma.liquidacionMensual.create({
                data: {
                  funcionario_rut: rut,
                  periodo_id: +periodoId,
                  ...payload
                }
              });
            }
          })
        );
      } else {
        batch.forEach(([rut, data]) => {
           if (maestroPreviewBatch.length < 50) maestroPreviewBatch.push(data);
        });
      }
      countTotal += batch.length;
    }

    return {
      message: dryRun ? 'Previsualización de Maestro' : 'Maestro Mensual cargado con éxito',
      totalProcesados: countTotal,
      preview: dryRun ? maestroPreviewBatch : undefined
    };
  }

  async importarValidacion(buffer: Buffer, periodoId: number, dryRun: boolean = false) {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetNames = workbook.SheetNames;
    
    // 1. Obtener Centro de Salud (Default: ID 1 si no hay usuarios)
    const centroId = 1; 

    // 2. Cargar Mapeo de Programas (de LISTADO DE PROGRAMAS APS 2026 )
    const programEntries: { num: string, name: string }[] = [];
    const listadoSheet = sheetNames.find(s => s.trim().startsWith('LISTADO DE PROGRAMAS'));
    if (listadoSheet) {
      const listadoData = xlsx.utils.sheet_to_json(workbook.Sheets[listadoSheet], { header: 1, range: 0 });
      (listadoData as any[]).forEach(row => {
        const progNum = String(row[1] || '').trim();
        const progName = String(row[2] || '').trim();
        if (progNum && progName && !isNaN(parseFloat(progNum))) {
          programEntries.push({ num: progNum, name: progName });
        }
      });
    }

    const programMap = new Map(programEntries.map(p => [p.num, p.name]));

    // Estructura: rut -> [ { category, concept, cant_25, cant_50, cant_habil, cant_inhabil, viaticos, atrasos } ]
    const finalEntries = new Map<string, any[]>();

    const getSheetData = (name: string, fallbackHeaderRow: number = 0) => {
      const search = name.toLowerCase().trim();
      const actualName = sheetNames.find(sn => sn.toLowerCase().trim() === search);
      if (!actualName) return [];
      
      const sheet = workbook.Sheets[actualName];
      const rows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      
      let headerIdx = -1;
      // Intento 1: Buscar etiquetas RUN, RUT, NOMBRE
      for (let i = 0; i < Math.min(rows.length, 12); i++) {
        const row = rows[i];
        if (row && row.some(cell => {
          const c = String(cell).toUpperCase();
          return c.includes('RUN') || c.includes('RUT') || c.includes('NOMBRE');
        })) {
          headerIdx = i;
          break;
        }
      }

      // Intento 2: Si no hay cabeceras, buscar la primera fila que parezca tener un RUT en col 0 o 1
      if (headerIdx === -1) {
        const rutRegex = /\d{1,2}[\.\d]*\-[\dkK]/;
        for (let i = 0; i < Math.min(rows.length, 15); i++) {
          const row = rows[i];
          if (row && (rutRegex.test(String(row[0])) || rutRegex.test(String(row[1])))) {
            // No hay cabeceras, creamos cabeceras genéricas y devolvemos desde aquí
            const headers = ['RUN', 'NOMBRE COMPLETO', 'CANTIDAD HORAS 25 %', 'CANTIDAD HORAS 50%', 'VIATICOS', 'ATRASOS'];
            return rows.slice(i).map(r => {
              const obj: any = {};
              headers.forEach((h, j) => { obj[h] = r[j]; });
              return obj;
            });
          }
        }
      }

      if (headerIdx === -1) headerIdx = fallbackHeaderRow;

      const headers = rows[headerIdx] || [];
      const dataRows = rows.slice(headerIdx + 1);
      
      return dataRows.map(row => {
        const obj: any = {};
        headers.forEach((h, i) => {
          if (h) obj[String(h).trim()] = row[i];
        });
        return obj;
      }).filter(obj => Object.values(obj).some(v => v !== '')); // Filtrar filas vacías
    };

    const addEntry = (rut: string, entry: any) => {
      let entries = finalEntries.get(rut);
      if (!entries) {
        entries = [];
        finalEntries.set(rut, entries);
      }
      entries.push(entry);
    };

    const findValue = (row: any, patterns: string[]) => {
      const key = Object.keys(row).find(k => patterns.some(p => k.toUpperCase().includes(p.toUpperCase())));
      return key ? row[key] : undefined;
    };

    // --- PROCESAMIENTO UNIVERSAL ---

    // A. HORAS EXTRAS (NUEVO + LEGADO)
    sheetNames.forEach(sheetName => {
      const s = sheetName.toUpperCase();
      let category: string | null = null;
      let concept: string = sheetName;
      let data: any[] = [];

      if (s.includes('PRESUPUESTARIA') || s.includes('25%') || s.includes('50%')) {
        category = 'PRESUPUESTARIA';
        concept = s.includes('PRESUPUESTARIA') ? 'Horas Extras Presupuestarias' : `H.E. Consolidada (${sheetName})`;
        data = getSheetData(sheetName, 3);
      } 
      else if (s.startsWith('HORAS EXTRAS PROG.') || s.includes('SAR') || s.includes('MANTENIMIENTO') || s.includes('INV') || s.includes('APS')) {
        category = 'PROGRAMA_HE';
        const progNum = sheetName.replace('HORAS EXTRAS PROG.', '').trim().replace(',', '.');
        concept = programMap.get(progNum) || sheetName;
        data = getSheetData(sheetName, 4);
      }
      else if (s.includes('SUR') || s.includes('SAPU') || s.includes('PR. RES.')) {
        category = 'PROGRAMA_TURNO';
        data = getSheetData(sheetName, 3);
      }
      else if (s.includes('VIÁTICO') || s.includes('VIATICO')) {
        category = 'VIATICOS';
        data = getSheetData(sheetName, 3);
      }
      else if (s.includes('ATRASO')) {
        category = 'ATRASOS';
        data = getSheetData(sheetName, 3);
      }

      if (category && data.length > 0) {
        data.forEach((row: any) => {
          const rut = this.normalizeRut(findValue(row, ['RUN', 'RUT']));
          if (!rut) return;

          if (category === 'PRESUPUESTARIA' || category === 'PROGRAMA_HE') {
            addEntry(rut, {
              category,
              concept,
              cant_25: Number(findValue(row, ['25 %', '25%']) || 0),
              cant_50: Number(findValue(row, ['50 %', '50%']) || 0),
            });
          } else if (category === 'PROGRAMA_TURNO') {
            addEntry(rut, {
              category,
              concept,
              cant_habil: Number(findValue(row, ['HABIL']) || 0),
              cant_inhabil: Number(findValue(row, ['INHABIL']) || 0),
            });
          } else if (category === 'VIATICOS') {
            addEntry(rut, {
              category,
              concept,
              viaticos: Number(findValue(row, ['TOTAL', 'MONTO']) || 0),
            });
          } else if (category === 'ATRASOS') {
            const minutosRaw = String(findValue(row, ['MINUTOS', 'ATRASO']) || '0');
            addEntry(rut, {
              category,
              concept,
              minutos_atraso: parseInt(minutosRaw.replace(/[^0-9]/g, '')) || 0,
            });
          }
        });
      }
    });

    let count = 0;
    const previewData: any[] = [];

    if (dryRun) {
      for (const [rut, entries] of Array.from(finalEntries.entries())) {
        entries.forEach(e => previewData.push({ rut, ...e }));
      }
      return {
        message: 'Previsualización de Validación (Granular)',
        totalFuncionarios: finalEntries.size,
        totalRegistros: previewData.length,
        preview: previewData.slice(0, 100)
      };
    }

    // --- INTEGRACIÓN CON EL WORKFLOW DE CONSOLIDADOS ---
    return this.consolidateAuditToWorkflow(periodoId, centroId, finalEntries, programEntries);
  }

  /**
   * CORE AGGREGATOR: Esta lógica es independiente de la fuente (Excel o Novedades)
   * Encargada de poblar Consolidados, HorasExtras, Viaticos, etc.
   */
  private async consolidateAuditToWorkflow(
    periodoId: number, 
    centroId: number, 
    finalEntries: Map<string, any[]>,
    programEntries: { num: string, name: string }[]
  ) {
    // 1. Sincronizar Catálogo de Programas en DB
    for (const p of programEntries) {
      await this.prisma.programa.upsert({
        where: { id: parseInt(p.num) },
        update: { nombre: p.name },
        create: { id: parseInt(p.num), nombre: p.name, categoria_enum: 'PROGRAMA_APS' }
      });
    }

    // 2. Asegurar existencia del Consolidado para el periodo/centro
    // Intentamos buscar por combinación única si existiera, o usamos findFirst
    let consolidado = await this.prisma.consolidado.findFirst({
      where: { centro_salud_id: centroId, periodo_id: +periodoId }
    });

    if (!consolidado) {
      consolidado = await this.prisma.consolidado.create({
        data: {
          centro_salud_id: centroId,
          periodo_id: +periodoId,
          estado_actual_enum: 'AUDITORIA_TECNICA',
        }
      });
    }

    // 3. Limpiar datos previos del consolidado (para evitar duplicados en re-importaciones)
    await this.prisma.$transaction([
      this.prisma.horasExtras.deleteMany({ where: { consolidado_id: consolidado.id } }),
      this.prisma.viaticos.deleteMany({ where: { consolidado_id: consolidado.id } }),
      this.prisma.atrasos.deleteMany({ where: { consolidado_id: consolidado.id } }),
      this.prisma.turnosUrgencia.deleteMany({ where: { consolidado_id: consolidado.id } }),
    ]);

    // 4. Ingesta Masiva de Datos (Batch Mode)
    const CONCURRENCY = 20;
    const entriesArray = Array.from(finalEntries.entries());
    let count = 0;

    for (let i = 0; i < entriesArray.length; i += CONCURRENCY) {
      const chunk = entriesArray.slice(i, i + CONCURRENCY);
      
      await Promise.all(chunk.map(async ([rut, entries]) => {
        const total25 = entries.reduce((acc, curr) => acc + (curr.cant_25 || 0), 0);
        const total50 = entries.reduce((acc, curr) => acc + (curr.cant_50 || 0), 0);
        const totalViaticos = entries.reduce((acc, curr) => acc + (curr.viaticos || 0), 0);
        const totalAtrasos = entries.reduce((acc, curr) => acc + (curr.minutos_atraso || 0), 0);

        // A. Asegurar Funcionario
        const nameEntry = entries.find(e => e.nombre_completo);
        await this.prisma.funcionario.upsert({
          where: { rut },
          update: {},
          create: {
            rut,
            nombre_completo: nameEntry?.nombre_completo || 'Funcionario Nuevo (Pendiente)',
            profesion_enum: 'POR_CLASIFICAR'
          }
        });

        // B. Poblar Tablas de Detalle (Workflow Finanzas/Control)
        // B. Poblar Tablas de Detalle en Batch
        const horasExtrasData = [];
        const viaticosData = [];
        const atrasosData = [];
        const turnosData = [];

        for (const entry of entries) {
          if (entry.category === 'PRESUPUESTARIA' || entry.category === 'PROGRAMA_HE') {
            horasExtrasData.push({
              consolidado_id: consolidado.id,
              funcionario_rut: rut,
              programa_id: entry.category === 'PRESUPUESTARIA' ? 1 : parseInt(entry.concept.split(' ')[0]) || 1,
              cantidad_25: entry.cant_25 || 0,
              cantidad_50: entry.cant_50 || 0,
              fecha_inicio: new Date(),
              fecha_termino: new Date(),
            });
          } else if (entry.category === 'VIATICOS') {
            viaticosData.push({
              consolidado_id: consolidado.id,
              funcionario_rut: rut,
              tipo_destino: 'NACIONAL' as any,
              fecha_inicio: new Date(),
              fecha_termino: new Date(),
              monto_calculado: entry.viaticos || 0,
              concepto: entry.concept,
            });
          } else if (entry.category === 'ATRASOS') {
            atrasosData.push({
              consolidado_id: consolidado.id,
              funcionario_rut: rut,
              minutos: entry.minutos_atraso || 0,
              tiempo_descuento: `${entry.minutos_atraso} min`,
              monto_descuento: 0,
              concepto: entry.concept,
            });
          } else if (entry.category === 'PROGRAMA_TURNO') {
            turnosData.push({
              consolidado_id: consolidado.id,
              funcionario_rut: rut,
              cant_turnos_habiles: entry.cant_habil || 0,
              cant_turnos_inhabiles: entry.cant_inhabil || 0,
              fecha_inicio: new Date(),
              fecha_termino: new Date(),
              monto_calculado: 0,
            });
          }
        }

        await Promise.all([
          this.prisma.horasExtras.createMany({ data: horasExtrasData }),
          this.prisma.viaticos.createMany({ data: viaticosData }),
          this.prisma.atrasos.createMany({ data: atrasosData }),
          this.prisma.turnosUrgencia.createMany({ data: turnosData }),
        ]);

        // C. Actualizar Liquidación Mensual para KPI rápidos
        await this.prisma.liquidacionMensual.upsert({
          where: { funcionario_rut_periodo_id: { funcionario_rut: rut, periodo_id: +periodoId } },
          update: {
            cantidad_he_25_real: total25,
            cantidad_he_50_real: total50,
            monto_viaticos_real: totalViaticos,
            minutos_atraso_real: totalAtrasos,
            detalle_json: { validationEntries: entries }
          },
          create: {
            funcionario_rut: rut,
            periodo_id: +periodoId,
            sueldo_base: 0, total_haberes: 0, total_descuentos: 0, monto_liquido: 0,
            cantidad_he_25_real: total25,
            cantidad_he_50_real: total50,
            monto_viaticos_real: totalViaticos,
            minutos_atraso_real: totalAtrasos,
            detalle_json: { validationEntries: entries },
          }
        });
      }));
      count += chunk.length;
    }

    return {
      message: 'Consolidación de Auditoría completada con éxito',
      totalFuncionarios: count,
      consolidadoId: consolidado.id
    };
  }

  async getLiquidacion(rut: string, periodoId: number) {
    return this.prisma.liquidacionMensual.findUnique({
      where: {
        funcionario_rut_periodo_id: {
          funcionario_rut: rut,
          periodo_id: +periodoId
        }
      }
    });
  }

  async getHistorial(rut: string) {
    return this.prisma.liquidacionMensual.findMany({
      where: { funcionario_rut: rut },
      include: { periodo: true },
      orderBy: [
        { periodo: { anio: 'desc' } },
        { periodo: { mes: 'desc' } }
      ]
    });
  }
}
