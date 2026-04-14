import { IsString, IsNotEmpty, IsNumber, IsDateString, IsOptional, IsInt, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoValidacion } from '@prisma/client';

export class CreateAtrasoDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  consolidado_id: number;

  @ApiProperty({ example: '12345678-9' })
  @IsString()
  @IsNotEmpty()
  funcionario_rut: string;

  @ApiProperty({ example: '2026-03-16' })
  @IsDateString()
  fecha_inicio: string;

  @ApiProperty({ example: '2026-04-15' })
  @IsDateString()
  fecha_termino: string;

  @ApiProperty({ example: '02:30', description: 'Tiempo de descuento (HH:MM)' })
  @IsString()
  @IsNotEmpty()
  tiempo_descuento: string;

  @ApiProperty({ example: 4500.5, description: 'Monto a descontar' })
  @IsNumber()
  monto_descuento: number;

  @ApiPropertyOptional({ enum: EstadoValidacion, example: EstadoValidacion.PENDIENTE })
  @IsOptional()
  @IsEnum(EstadoValidacion)
  estado?: EstadoValidacion;
}
