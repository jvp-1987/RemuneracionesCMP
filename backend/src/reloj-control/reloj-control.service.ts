import { Injectable, BadRequestException } from '@nestjs/common';
import * as xlsx from 'xlsx';

@Injectable()
export class RelojControlService {
  
  async parseAttendanceReport(buffer: Buffer) {
    const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    console.log(`Procesando archivo RelojControl. Filas detectadas: ${data.length}`);

    if (data.length < 8) {
      throw new BadRequestException('El archivo no tiene el formato esperado de RelojControl (mínimo 8 filas)');
    }

    // El encabezado suele estar en la fila 8 (índice 7), pero busquemos por si acaso
    let headers: any[] = [];
    let headerRowIdx = 7;
    
    // Buscar la fila que contiene "RUT"
    for (let i = 0; i < Math.min(data.length, 20); i++) {
      const row = data[i] as any[];
      if (row && row.some(cell => String(cell).includes('RUT'))) {
        headers = row;
        headerRowIdx = i;
        break;
      }
    }

    if (headers.length === 0) {
      headers = data[7] as any[];
      headerRowIdx = 7;
    }

    const rutIdx = headers.findIndex(h => String(h).includes('RUT'));
    const fechaIdx = headers.findIndex(h => String(h).includes('Fecha'));
    const entradaIdx = headers.findIndex(h => String(h).includes('Entrada'));
    const salidaIdx = headers.findIndex(h => String(h).includes('Salida'));

    console.log(`Mapeo de columnas -> RUT: ${rutIdx}, Fecha: ${fechaIdx}, Entrada: ${entradaIdx}, Salida: ${salidaIdx}`);

    if (rutIdx === -1 || fechaIdx === -1) {
      throw new BadRequestException('No se encontraron las columnas críticas (RUT, Fecha) en las primeras filas del archivo');
    }

    const attendanceMap: Record<string, any[]> = {};

    for (let i = headerRowIdx + 1; i < data.length; i++) {
      const row = data[i] as any[];
      let rawRut = row[rutIdx];
      if (!rawRut) continue;

      const rut = this.normalizeRut(rawRut);
      const fechaNum = row[fechaIdx];
      const entradaNum = row[entradaIdx];
      const salidaNum = row[salidaIdx];

      if (!fechaNum) continue;

      if (!attendanceMap[rut]) {
        attendanceMap[rut] = [];
      }

      attendanceMap[rut].push({
        fecha: this.formatDate(fechaNum),
        entrada: this.formatTime(entradaNum),
        salida: this.formatTime(salidaNum),
      });
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

  private formatTime(v: any): string {
    if (!v || v === '0:00' || v === 0) return '-';
    if (v instanceof Date) {
      return `${String(v.getUTCHours()).padStart(2, '0')}:${String(v.getUTCMinutes()).padStart(2, '0')}`;
    }
    if (typeof v === 'number') {
      const totalSeconds = Math.round(v * 24 * 3600);
      const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    if (typeof v === 'string' && v.includes(':')) {
      return v.substring(0, 5);
    }
    return String(v);
  }

  private formatDate(v: any): string {
    if (!v) return '-';
    if (v instanceof Date) {
      return v.toISOString().split('T')[0];
    }
    if (typeof v === 'number') {
      const date = new Date((v - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    return String(v);
  }
}
