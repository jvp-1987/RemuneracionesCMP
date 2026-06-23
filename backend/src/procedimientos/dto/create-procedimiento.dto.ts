import { IsInt, IsNumber, IsString, IsNotEmpty, IsDateString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoValidacion } from '@prisma/client';

export class CreateProcedimientoDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  consolidado_id: number;

  @ApiProperty({ example: '12345678-9' })
  @IsString()
  @IsNotEmpty()
  funcionario_rut: string;

  @ApiProperty({ example: 25, description: 'Total de procedimientos realizados' })
  @IsInt()
  total_procedimientos: number;

  @ApiProperty({ example: '2026-02-16', description: 'Fecha inicio (16 del mes anterior)' })
  @IsDateString()
  fecha_inicio: string;

  @ApiProperty({ example: '2026-03-15', description: 'Fecha término (15 del mes actual)' })
  @IsDateString()
  fecha_termino: string;

  @ApiProperty({ example: 125000, description: 'Monto calculado' })
  @IsNumber()
  monto_calculado: number;

  @ApiPropertyOptional({ enum: EstadoValidacion, example: EstadoValidacion.PENDIENTE })
  @IsOptional()
  @IsEnum(EstadoValidacion)
  estado?: EstadoValidacion;
}
