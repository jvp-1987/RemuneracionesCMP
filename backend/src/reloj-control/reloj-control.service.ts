import { Injectable, BadRequestException } from '@nestjs/common';
import * as xlsx from 'xlsx';

@Injectable()
export class RelojControlService {
  
  async parseAttendanceReport(buffer: Buffer) {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    if (data.length < 8) {
      throw new BadRequestException('El archivo no tiene el formato esperado de RelojControl (mínimo 8 filas)');
    }

    // El encabezado está en la fila 8 (índice 7)
    const headers = data[7] as any[];
    const rutIdx = headers.indexOf('RUT');
    const fechaIdx = headers.indexOf('Fecha');
    const entradaIdx = headers.indexOf('Entrada');
    const salidaIdx = headers.indexOf('Salida');

    if (rutIdx === -1 || fechaIdx === -1) {
      throw new BadRequestException('No se encontraron las columnas críticas (RUT, Fecha) en la fila 8');
    }

    const attendanceMap: Record<string, any[]> = {};

    for (let i = 8; i < data.length; i++) {
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
    if (typeof v === 'number') {
      const totalSeconds = Math.round(v * 24 * 3600);
      const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
    return String(v);
  }

  private formatDate(v: any): string {
    if (!v) return '-';
    if (typeof v === 'number') {
      const date = new Date((v - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    return String(v);
  }
}
