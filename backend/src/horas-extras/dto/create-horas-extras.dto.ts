import { IsInt, IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoValidacion } from '@prisma/client';

export class CreateHorasExtrasDto {
  @ApiProperty({ example: 1, description: 'ID del Consolidado' })
  @IsInt()
  consolidado_id: number;

  @ApiProperty({ example: '12345678-9', description: 'RUT del funcionario' })
  @IsString()
  @IsNotEmpty()
  funcionario_rut: string;

  @ApiProperty({ example: 1, description: 'ID del Programa' })
  @IsInt()
  programa_id: number;

  @ApiProperty({ example: 5.5, description: 'Cantidad de horas al 25%' })
  @IsNumber()
  cantidad_25: number;

  @ApiProperty({ example: 3.0, description: 'Cantidad de horas al 50%' })
  @IsNumber()
  cantidad_50: number;

  @ApiProperty({ example: '2026-03-16', description: 'Fecha de inicio' })
  @IsDateString()
  fecha_inicio: string;

  @ApiProperty({ example: '2026-04-15', description: 'Fecha de término' })
  @IsDateString()
  fecha_termino: string;

  @ApiPropertyOptional({ example: 'Turno nocturno', description: 'Observaciones 25%' })
  @IsOptional()
  @IsString()
  observaciones_25?: string;

  @ApiPropertyOptional({ example: 'Turno nocturno', description: 'Observaciones 50%' })
  @IsOptional()
  @IsString()
  observaciones_50?: string;

  @ApiPropertyOptional({ enum: EstadoValidacion, example: EstadoValidacion.PENDIENTE })
  @IsOptional()
  @IsEnum(EstadoValidacion)
  estado_25?: EstadoValidacion;

  @ApiPropertyOptional({ enum: EstadoValidacion, example: EstadoValidacion.PENDIENTE })
  @IsOptional()
  @IsEnum(EstadoValidacion)
  estado_50?: EstadoValidacion;
}
