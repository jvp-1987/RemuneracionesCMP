import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as xlsx from 'xlsx';

const parseExcelDate = (val: any): Date => {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val === 'number') {
    // Excel base date is 1899-12-30
    const date = new Date((val - 25569) * 86400 * 1000);
    return date;
  }
  const parsed = Date.parse(val);
  if (!isNaN(parsed)) return new Date(parsed);
  // Try DD-MM-YYYY format
  const parts = String(val).split(/[-/]/);
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year = parseInt(parts[2]);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  return new Date();
};

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

    // Map para consolidar datos de funcionarios antes de guardar
    const funcionarioUpdateMap = new Map<string, any>();

    // 1. Procesar Datos Generales (Metadata Maestra)
    for (const row of dataGenerales as any[]) {
      const rut = this.normalizeRut(row['RUT'] || row['RUN']);
      if (!rut) continue;

      const nombreLargo = row['NOMBRE COMPLETO'] || `${row['NOMBRES'] || ''} ${row['APELLIDOS'] || ''}`.trim();
      
      const funcData = {
        nombre_completo: nombreLargo || 'Sin Nombre',
        categoria_aps: row['CATEGORIA APS'] || row['CATEGORIA'] || 'Z',
        nivel_aps: row['NIVEL APS'] || row['NIVEL'] ? +(row['NIVEL APS'] || row['NIVEL']) : 15,
        jornada_horas: row['JORNADA HRS'] || row['JORNADA'] ? +(row['JORNADA HRS'] || row['JORNADA']) : undefined,
        fecha_nacimiento: row['FECHA NACIMIENTO'] ? new Date(row['FECHA NACIMIENTO']) : undefined,
        profesion_enum: 'OTROS',
      };
      funcionarioUpdateMap.set(rut, funcData);

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
      
      if (!funcionarioUpdateMap.has(rut)) {
        funcionarioUpdateMap.set(rut, {
          nombre_completo: nombreLargo || 'Sin Nombre',
          categoria_aps: row['CATEGORIA APS'] || 'Z',
          nivel_aps: row['NIVEL APS'] ? +row['NIVEL APS'] : 15,
          jornada_horas: row['JORNADA HRS'] ? +row['JORNADA HRS'] : undefined,
          profesion_enum: 'OTROS',
        });
      }

      const existing = consolidadoMap.get(rut) || { rut, nombre: nombreLargo, detalle: {} };
      
      consolidadoMap.set(rut, {
        ...existing,
        originalRut: rawRut,
        sueldo_base: Number(row['SUELDO BASE'] || 0),
        total_haberes: Number(row['TOTAL HABERES'] || 0),
        monto_he_pagado: Number(row['HORAS EXTRAS 25%'] || 0) + Number(row['HORAS EXTRAS 50%'] || 0),
        cantidad_he_25_real: Number(row['CANT. H.E. 25%'] || row['HORAS EXTRAS 25% (CANTIDAD)'] || row['CANT. 25%'] || 0),
        cantidad_he_50_real: Number(row['CANT. H.E. 50%'] || row['HORAS EXTRAS 50% (CANTIDAD)'] || row['CANT. 50%'] || 0),
        monto_aps: Number(row['ASIGNACION APS'] || row['ASIG. APS'] || row['APS'] || row['ATENCION PRIMARIA'] || row['ATEN. PRIMARIA'] || 0),
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
      current.monto_atrasos_pagado = Number(row['5-HORAS DE ATRASOS'] || row['HORAS DE ATRASO'] || 0);
      current.minutos_atraso_real = parseInt(String(row['MINUTOS ATRASO'] || 0)) || 0;
      current.detalle = { ...current.detalle, ...row };
    });

    // 4. Preparar operaciones de Base de Datos
    if (!dryRun) {
      const funcionarioOperations = Array.from(funcionarioUpdateMap.entries()).map(([rut, data]) => 
        this.prisma.funcionario.upsert({
          where: { rut },
          update: data,
          create: { rut, ...data }
        })
      );

      const liquidacionOperations = Array.from(consolidadoMap.entries()).map(([rut, data]) => 
        this.prisma.liquidacionMensual.upsert({
          where: {
            funcionario_rut_periodo_id: {
              funcionario_rut: rut,
              periodo_id: +periodoId
            }
          },
          update: {
            sueldo_base: data.sueldo_base,
            total_haberes: data.total_haberes,
            total_descuentos: data.total_descuentos || 0,
            monto_liquido: data.monto_liquido || 0,
            monto_he_pagado: data.monto_he_pagado,
            monto_atrasos_pagado: data.monto_atrasos_pagado || 0,
            cantidad_he_25_real: data.cantidad_he_25_real || 0,
            cantidad_he_50_real: data.cantidad_he_50_real || 0,
            minutos_atraso_real: data.minutos_atraso_real || 0,
            detalle_json: {
              ...data.detalle,
              calculated_monto_aps: data.monto_aps,
              calculated_monto_zona: data.monto_zona,
              calculated_monto_dificil: data.monto_dificil
            }
          },
          create: {
            funcionario_rut: rut,
            periodo_id: +periodoId,
            sueldo_base: data.sueldo_base,
            total_haberes: data.total_haberes,
            total_descuentos: data.total_descuentos || 0,
            monto_liquido: data.monto_liquido || 0,
            monto_he_pagado: data.monto_he_pagado,
            monto_atrasos_pagado: data.monto_atrasos_pagado || 0,
            cantidad_he_25_real: data.cantidad_he_25_real || 0,
            cantidad_he_50_real: data.cantidad_he_50_real || 0,
            minutos_atraso_real: data.minutos_atraso_real || 0,
            detalle_json: {
              ...data.detalle,
              calculated_monto_aps: data.monto_aps,
              calculated_monto_zona: data.monto_zona,
              calculated_monto_dificil: data.monto_dificil
            }
          }
        })
      );

      // Ejecutar en transacciones
      if (funcionarioOperations.length > 0) await this.prisma.$transaction(funcionarioOperations);
      if (liquidacionOperations.length > 0) await this.prisma.$transaction(liquidacionOperations);
    }

    const previewData = Array.from(consolidadoMap.values());
    const count = previewData.length;

    return {
      message: dryRun ? 'Previsualización de Maestro' : 'Maestro Mensual cargado con éxito',
      totalProcesados: count,
      preview: dryRun ? previewData.slice(0, 50) : undefined
    };
  }

  async importarValidacion(buffer: Buffer, periodoId: number, centroId: number, dryRun: boolean = false) {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetNames = workbook.SheetNames;
    
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
            const comunalQty = Number(row['VIATICO COMUNAL'] || 0);
            const fueraQty = Number(row['VIATICO FUERA COMUNA'] || 0);
            let tipoDestino = 'DENTRO COMUNA';
            if (fueraQty > 0) {
              tipoDestino = 'FUERA COMUNA';
            } else if (comunalQty > 0) {
              tipoDestino = 'DENTRO COMUNA';
            }
            
            const startVal = row['FECHA INICIO'] || row['INICIO'] || null;
            const endVal = row['FECHA TERMINO'] || row['TERMINO'] || null;

            addEntry(rut, {
              category,
              concept,
              viaticos: Number(row['TOTAL'] || findValue(row, ['TOTAL', 'MONTO']) || 0),
              tipo_destino: tipoDestino,
              fecha_inicio: startVal ? parseExcelDate(startVal) : null,
              fecha_termino: endVal ? parseExcelDate(endVal) : null,
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
      where: { centro_salud_id: centroId, periodo_id: +periodoId },
      include: { periodo: true }
    });

    if (consolidado) {
      // BLOQUEOS DE SEGURIDAD ANTES DE SOBREESCRIBIR
      if (consolidado.periodo?.estado === 'Cerrado') {
        throw new BadRequestException('No se pueden importar novedades en un periodo CERRADO.');
      }
      if (consolidado.vb_control_interno) {
        throw new ForbiddenException('Edición bloqueada: El consolidado ya está validado por Control Interno. No se puede sobreescribir mediante re-importación.');
      }
    } else {
      // Si no existe, lo creamos
      consolidado = await this.prisma.consolidado.create({
        data: {
          centro_salud_id: centroId,
          periodo_id: +periodoId,
          estado_actual_enum: 'AUDITORIA_TECNICA',
        },
        include: { periodo: true }
      });
    }

    // 3. Limpiar datos previos del consolidado (para evitar duplicados en re-importaciones, conservando hallazgos/observaciones)
    await this.prisma.$transaction([
      this.prisma.horasExtras.deleteMany({
        where: {
          consolidado_id: consolidado.id,
          estado_25: { not: 'RECHAZADO' },
          estado_50: { not: 'RECHAZADO' },
          AND: [
            { OR: [{ observaciones_25: null }, { observaciones_25: '' }] },
            { OR: [{ observaciones_50: null }, { observaciones_50: '' }] }
          ]
        }
      }),
      this.prisma.viaticos.deleteMany({
        where: {
          consolidado_id: consolidado.id,
          estado: { not: 'RECHAZADO' },
          OR: [
            { justificacion: null },
            { justificacion: '' }
          ]
        }
      }),
      this.prisma.atrasos.deleteMany({
        where: {
          consolidado_id: consolidado.id,
          estado: { not: 'RECHAZADO' },
          OR: [
            { concepto: null },
            { concepto: '' }
          ]
        }
      }),
      this.prisma.turnosUrgencia.deleteMany({
        where: {
          consolidado_id: consolidado.id,
          estado: { not: 'RECHAZADO' },
          OR: [
            { observaciones: null },
            { observaciones: '' }
          ]
        }
      }),
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
        for (const entry of entries) {
          if (entry.category === 'PRESUPUESTARIA' || entry.category === 'PROGRAMA_HE') {
            const programaId = entry.category === 'PRESUPUESTARIA' ? 1 : parseInt(entry.concept.split(' ')[0]) || 1;
            const existing = await this.prisma.horasExtras.findFirst({
              where: {
                consolidado_id: consolidado.id,
                funcionario_rut: rut,
                programa_id: programaId,
              }
            });

            if (existing) {
              await this.prisma.horasExtras.update({
                where: { id: existing.id },
                data: {
                  cantidad_25: entry.cant_25 || 0,
                  cantidad_50: entry.cant_50 || 0,
                }
              });
            } else {
              await this.prisma.horasExtras.create({
                data: {
                  consolidado_id: consolidado.id,
                  funcionario_rut: rut,
                  programa_id: programaId,
                  cantidad_25: entry.cant_25 || 0,
                  cantidad_50: entry.cant_50 || 0,
                  fecha_inicio: new Date(),
                  fecha_termino: new Date(),
                }
              });
            }
          } else if (entry.category === 'VIATICOS') {
            const tipoDestino = entry.tipo_destino || 'DENTRO COMUNA';
            const existing = await this.prisma.viaticos.findFirst({
              where: {
                consolidado_id: consolidado.id,
                funcionario_rut: rut,
                tipo_destino: tipoDestino,
              }
            });

            if (existing) {
              await this.prisma.viaticos.update({
                where: { id: existing.id },
                data: {
                  monto_calculado: entry.viaticos || 0,
                  fecha_inicio: entry.fecha_inicio || new Date(),
                  fecha_termino: entry.fecha_termino || new Date(),
                  concepto: entry.concept,
                }
              });
            } else {
              await this.prisma.viaticos.create({
                data: {
                  consolidado_id: consolidado.id,
                  funcionario_rut: rut,
                  tipo_destino: tipoDestino,
                  fecha_inicio: entry.fecha_inicio || new Date(),
                  fecha_termino: entry.fecha_termino || new Date(),
                  monto_calculado: entry.viaticos || 0,
                  concepto: entry.concept,
                }
              });
            }
          } else if (entry.category === 'ATRASOS') {
            const existing = await this.prisma.atrasos.findFirst({
              where: {
                consolidado_id: consolidado.id,
                funcionario_rut: rut,
              }
            });

            if (existing) {
              await this.prisma.atrasos.update({
                where: { id: existing.id },
                data: {
                  minutos: entry.minutos_atraso || 0,
                  tiempo_descuento: `${entry.minutos_atraso} min`,
                  concepto: entry.concept,
                }
              });
            } else {
              await this.prisma.atrasos.create({
                data: {
                  consolidado_id: consolidado.id,
                  funcionario_rut: rut,
                  fecha_inicio: null,
                  fecha_termino: null,
                  minutos: entry.minutos_atraso || 0,
                  tiempo_descuento: `${entry.minutos_atraso} min`,
                  monto_descuento: 0,
                  concepto: entry.concept,
                }
              });
            }
          } else if (entry.category === 'PROGRAMA_TURNO') {
            let programa_id = 1;
            const progName = entry.concept;
            if (progName) {
              let prog = await this.prisma.programa.findFirst({
                where: { nombre: String(progName) }
              });
              if (!prog) {
                prog = await this.prisma.programa.findFirst({
                  where: { nombre: { contains: String(progName).substring(0, 15) } }
                });
              }
              if (prog) {
                programa_id = prog.id;
              } else {
                const newProg = await this.prisma.programa.create({
                  data: {
                    nombre: String(progName).substring(0, 100),
                    categoria_enum: 'PROGRAMAS_TURNO'
                  }
                });
                programa_id = newProg.id;
              }
            }

            const existing = await this.prisma.turnosUrgencia.findFirst({
              where: {
                consolidado_id: consolidado.id,
                funcionario_rut: rut,
                programa_id,
              }
            });

            if (existing) {
              await this.prisma.turnosUrgencia.update({
                where: { id: existing.id },
                data: {
                  cant_turnos_habiles: entry.cant_habil || 0,
                  cant_turnos_inhabiles: entry.cant_inhabil || 0,
                  monto_calculado: (Number(entry.cant_habil || 0) * Number(existing.valor_habil || 0)) +
                                   (Number(entry.cant_inhabil || 0) * Number(existing.valor_inhabil || 0)),
                }
              });
            } else {
              await this.prisma.turnosUrgencia.create({
                data: {
                  consolidado_id: consolidado.id,
                  funcionario_rut: rut,
                  cant_turnos_habiles: entry.cant_habil || 0,
                  cant_turnos_inhabiles: entry.cant_inhabil || 0,
                  fecha_inicio: new Date(),
                  fecha_termino: new Date(),
                  monto_calculado: 0,
                  programa_id,
                }
              });
            }
          }
        }

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
