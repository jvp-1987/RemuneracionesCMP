import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CalculosService {
  constructor(private readonly prisma: PrismaService) {}

  async obtenerDesgloseSueldo(rut: string) {
    const funcionario = await this.prisma.funcionario.findUnique({
      where: { rut },
      include: { centro_salud: true }
    });

    if (!funcionario || !funcionario.categoria_aps || !funcionario.nivel_aps) {
      return null;
    }

    // PRIORIDAD: Intentar obtener datos reales del último Maestro cargado
    const latestLiq = await this.prisma.liquidacionMensual.findFirst({
      where: { funcionario_rut: rut },
      orderBy: [
        { periodo: { anio: 'desc' } },
        { periodo: { mes: 'desc' } }
      ]
    });

    const detail = latestLiq?.detalle_json as any;
    
    // Si tenemos datos reales en el detalle_json (cargados vía RemuneracionesService.importarMaestroMensual)
    if (detail?.calculated_monto_aps !== undefined) {
      const sueldoBaseReal = Number(latestLiq?.sueldo_base || 0);
      const montoAPS = Number(detail.calculated_monto_aps || 0);
      const montoZona = Number(detail.calculated_monto_zona || 0);
      const montoDificil = Number(detail.calculated_monto_dificil || 0);
      
      const totalBaseMensual = sueldoBaseReal + montoAPS + montoZona + montoDificil;
      const baseParaHoraExtra = sueldoBaseReal + montoAPS;

      return {
        escala_base: sueldoBaseReal,
        asignacion_aps: montoAPS,
        asignacion_zona: montoZona,
        desempeno_dificil: montoDificil,
        porcentaje_zona: Number(funcionario.centro_salud?.porcentaje_zona || 0),
        porcentaje_dificil: Number(funcionario.centro_salud?.porcentaje_dificil || 0),
        total_base_mensual: totalBaseMensual,
        valor_hora: baseParaHoraExtra / 190,
        is_real_data: true
      };
    }

    // FALLBACK: Cálculo teórico basado en escala
    console.log(`Buscando escala para: ${funcionario.categoria_aps} ${funcionario.nivel_aps}`);
    const escala = await this.prisma.escalaSueldo.findFirst({
      where: {
        categoria: funcionario.categoria_aps,
        nivel: funcionario.nivel_aps,
      },
    });

    if (!escala) {
      console.log('Escala no encontrada');
      return null;
    }

    const sueldoBase = Number(escala.sueldo_base);
    const asignacionAPS = sueldoBase; // 100%
    const subtotalBaseAps = sueldoBase + asignacionAPS;

    const porZona = Number(funcionario.centro_salud?.porcentaje_zona || 0);
    const porDificil = Number(funcionario.centro_salud?.porcentaje_dificil || 0);

    const montoZona = sueldoBase * (porZona / 100);
    const montoDificil = subtotalBaseAps * (porDificil / 100);

    const sueldoTotal = subtotalBaseAps + montoZona + montoDificil;

    return {
      escala_base: sueldoBase,
      asignacion_aps: asignacionAPS,
      asignacion_zona: montoZona,
      desempeno_dificil: montoDificil,
      porcentaje_zona: porZona,
      porcentaje_dificil: porDificil,
      total_base_mensual: sueldoTotal,
      valor_hora: subtotalBaseAps / 190,
      is_real_data: false
    };
  }

  async calcularValorHora(rut: string): Promise<number> {
    const desglose = await this.obtenerDesgloseSueldo(rut);
    return desglose?.valor_hora || 0;
  }

  async calcularMontoExtra(rut: string, horas25: number, horas50: number) {
    const valorHora = await this.calcularValorHora(rut);
    return {
      monto25: Number(horas25) * valorHora * 1.25,
      monto50: Number(horas50) * valorHora * 1.50,
    };
  }

  getMontoViatico(tipo: string): number {
    const t = tipo.toLowerCase();
    if (t.includes('fuera')) return 9000;
    return 7000;
  }

  calcularMontoAtraso(valorHora: number, tiempoStr: string): number {
    // tiempoStr ej: '94 MINUTOS' o '02:30'
    let minutos = 0;
    if (tiempoStr.toUpperCase().includes('MINUTO')) {
      minutos = parseInt(tiempoStr);
    } else if (tiempoStr.includes(':')) {
      const [h, m] = tiempoStr.split(':').map(Number);
      minutos = (h * 60) + m;
    }
    return (valorHora / 60) * minutos;
  }
}
