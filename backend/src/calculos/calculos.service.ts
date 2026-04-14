import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CalculosService {
  constructor(private readonly prisma: PrismaService) {}

  async calcularValorHora(rut: string): Promise<number> {
    const funcionario = await this.prisma.funcionario.findUnique({
      where: { rut },
      include: { centro_salud: true }
    });

    if (!funcionario || !funcionario.categoria_aps || !funcionario.nivel_aps) {
      return 0;
    }

    const escala = await this.prisma.escalaSueldo.findUnique({
      where: {
        categoria_nivel: {
          categoria: funcionario.categoria_aps,
          nivel: funcionario.nivel_aps,
        },
      },
    });

    if (!escala) return 0;

    const sueldoBase = Number(escala.sueldo_base);
    const asignacionAPS = sueldoBase; 
    const sumaBaseAPS = sueldoBase + asignacionAPS;

    // Obtener porcentajes del centro vinculado
    const porZona = Number(funcionario.centro_salud?.porcentaje_zona || 0) / 100;
    const porDificil = Number(funcionario.centro_salud?.porcentaje_dificil || 0) / 100;

    const montoZona = sumaBaseAPS * porZona;
    const montoDificil = sumaBaseAPS * porDificil;

    const sueldoTotal = sumaBaseAPS + montoZona + montoDificil;
    
    // Divisor fijo = 176
    return sueldoTotal / 176;
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
