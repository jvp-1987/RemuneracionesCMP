import { Injectable, BadRequestException } from '@nestjs/common';
import * as xlsx from 'xlsx';

@Injectable()
export class RelojControlService {
  
  async parseAttendanceReport(buffer: Buffer) {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    console.log(`Procesando archivo RelojControl. Filas detectadas: ${data.length}`);

    if (data.length < 5) {
      throw new BadRequestException('El archivo no tiene el formato esperado (mínimo 5 filas)');
    }

    // Buscar la cabecera buscando la fila que contiene "RUT"
    let headers: any[] = [];
    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(data.length, 25); i++) {
      const row = data[i] as any[];
      if (row && row.some(cell => String(cell).includes('RUT'))) {
        headers = row.map(h => String(h).trim());
        headerRowIdx = i;
        break;
      }
    }

    if (headers.length === 0) {
      headers = (data[4] || []) as any[];
      headerRowIdx = 4;
    }

    const rutIdx = headers.findIndex(h => String(h).includes('RUT'));
    const fechaHoraIdx = headers.findIndex(h => String(h).includes('Fecha/Hora') || String(h).includes('Fecha'));
    const tipoIdx = headers.findIndex(h => String(h).includes('Tipo registro') || String(h).includes('Tipo'));
    
    const entradaIdx = headers.findIndex(h => String(h).includes('Entrada'));
    const salidaIdx = headers.findIndex(h => String(h).includes('Salida'));

    console.log(`Mapeo de columnas -> RUT: ${rutIdx}, Fecha/Hora/Fecha: ${fechaHoraIdx}, Tipo: ${tipoIdx}, Entrada: ${entradaIdx}, Salida: ${salidaIdx}`);

    if (rutIdx === -1) {
      throw new BadRequestException('No se encontró la columna RUT en las primeras filas del archivo');
    }

    const isTransactional = tipoIdx !== -1;
    const attendanceMap: Record<string, any[]> = {};

    if (isTransactional) {
      console.log('Procesando como formato transaccional (reloj por transacciones)...');
      const userScans: Record<string, any[]> = {};

      for (let i = headerRowIdx + 1; i < data.length; i++) {
        const row = data[i] as any[];
        if (!row || row.length === 0) continue;

        const rawRut = row[rutIdx];
        if (!rawRut) continue;

        const rut = this.normalizeRut(rawRut);
        const fechaHoraVal = row[fechaHoraIdx];
        const tipo = String(row[tipoIdx] || '').trim();

        if (!fechaHoraVal) continue;

        let fecha = '';
        let hora = '';
        let timestamp: Date | null = null;

        if (typeof fechaHoraVal === 'number') {
          const parsed = this.parseExcelSerial(fechaHoraVal);
          fecha = parsed.fecha;
          hora = parsed.hora;
          
          const days = Math.floor(fechaHoraVal);
          const timeFraction = fechaHoraVal - days;
          timestamp = new Date(Date.UTC(1899, 11, 30) + days * 24 * 3600 * 1000 + timeFraction * 24 * 3600 * 1000);
        } else {
          const strVal = String(fechaHoraVal).trim();
          const match = strVal.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2}):(\d{1,2})/);
          if (match) {
            const [_, day, month, year, hours, minutes] = match;
            fecha = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            hora = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
            timestamp = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10), parseInt(hours, 10), parseInt(minutes, 10));
          }
        }

        if (!fecha || !hora) continue;

        if (!userScans[rut]) {
          userScans[rut] = [];
        }

        userScans[rut].push({
          fecha,
          hora,
          tipo,
          timestamp: timestamp || new Date()
        });
      }

      // Emparejar transacciones cronológicamente
      Object.keys(userScans).forEach(rut => {
        const scans = userScans[rut].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        attendanceMap[rut] = [];

        let pendingEntrada: any = null;

        for (let j = 0; j < scans.length; j++) {
          const scan = scans[j];

          if (scan.tipo === 'Entrada') {
            if (pendingEntrada) {
              attendanceMap[rut].push({
                fecha: pendingEntrada.fecha,
                entrada: pendingEntrada.hora,
                salida: '-'
              });
            }
            pendingEntrada = scan;
          } else if (scan.tipo === 'Salida') {
            if (pendingEntrada) {
              const diffHours = (scan.timestamp.getTime() - pendingEntrada.timestamp.getTime()) / (1000 * 60 * 60);
              if (diffHours >= 0 && diffHours <= 20) {
                attendanceMap[rut].push({
                  fecha: pendingEntrada.fecha,
                  entrada: pendingEntrada.hora,
                  salida: scan.hora
                });
                pendingEntrada = null;
              } else {
                attendanceMap[rut].push({
                  fecha: pendingEntrada.fecha,
                  entrada: pendingEntrada.hora,
                  salida: '-'
                });
                attendanceMap[rut].push({
                  fecha: scan.fecha,
                  entrada: '-',
                  salida: scan.hora
                });
                pendingEntrada = null;
              }
            } else {
              attendanceMap[rut].push({
                fecha: scan.fecha,
                entrada: '-',
                salida: scan.hora
              });
            }
          }
        }

        if (pendingEntrada) {
          attendanceMap[rut].push({
            fecha: pendingEntrada.fecha,
            entrada: pendingEntrada.hora,
            salida: '-'
          });
        }

        // Ordenar resultado por fecha
        attendanceMap[rut].sort((a, b) => a.fecha.localeCompare(b.fecha));
      });

    } else {
      console.log('Procesando como formato diario (columnas Entrada y Salida)...');
      if (fechaHoraIdx === -1 || entradaIdx === -1) {
        throw new BadRequestException('Faltan columnas de Entrada o Fecha en el archivo');
      }

      for (let i = headerRowIdx + 1; i < data.length; i++) {
        const row = data[i] as any[];
        if (!row || row.length === 0) continue;

        const rawRut = row[rutIdx];
        if (!rawRut) continue;

        const rut = this.normalizeRut(rawRut);
        const fechaVal = row[fechaHoraIdx];
        const entradaVal = row[entradaIdx];
        const salidaVal = row[salidaIdx];

        if (!fechaVal) continue;

        if (!attendanceMap[rut]) {
          attendanceMap[rut] = [];
        }

        attendanceMap[rut].push({
          fecha: this.formatDate(fechaVal),
          entrada: this.formatTime(entradaVal),
          salida: this.formatTime(salidaVal)
        });
      }
    }

    return attendanceMap;
  }

  private normalizeRut(rut: any): string {
    if (!rut) return '';
    let str = String(rut).trim().toUpperCase();
    str = str.replace(/\./g, '');
    str = str.replace(/^0+/, '');
    return str;
  }

  private parseExcelSerial(val: number) {
    const days = Math.floor(val);
    const timeFraction = val - days;

    const msPerDay = 24 * 60 * 60 * 1000;
    const date = new Date(Date.UTC(1899, 11, 30) + days * msPerDay);
    
    const totalSeconds = Math.round(timeFraction * 24 * 3600);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    return {
      fecha: `${year}-${month}-${day}`,
      hora: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    };
  }

  private formatTime(v: any): string {
    if (!v || v === '0:00' || v === 0) return '-';
    if (v instanceof Date) {
      return `${String(v.getUTCHours()).padStart(2, '0')}:${String(v.getUTCMinutes()).padStart(2, '0')}`;
    }
    if (typeof v === 'number') {
      return this.parseExcelSerial(v).hora;
    }
    if (typeof v === 'string') {
      if (v.includes(':')) return v.substring(0, 5);
      return v;
    }
    return String(v);
  }

  private formatDate(v: any): string {
    if (!v) return '-';
    if (v instanceof Date) {
      return v.toISOString().split('T')[0];
    }
    if (typeof v === 'number') {
      return this.parseExcelSerial(v).fecha;
    }
    if (typeof v === 'string') {
      const match = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (match) {
        const [_, day, month, year] = match;
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      return v;
    }
    return String(v);
  }
}
