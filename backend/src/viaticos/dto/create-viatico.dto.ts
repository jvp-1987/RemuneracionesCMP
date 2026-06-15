import { IsString, IsNotEmpty, IsNumber, IsDateString, IsOptional, IsInt, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoValidacion } from '@prisma/client';

export class CreateViaticoDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  consolidado_id: number;

  @ApiProperty({ example: '12345678-9' })
  @IsString()
  @IsNotEmpty()
  funcionario_rut: string;

  @ApiProperty({ example: 'C. Coñaripe', description: 'Destino: C. Coñaripe, C. Choshuenco, Panguipulli, Fuera de Comuna' })
  @IsString()
  @IsNotEmpty()
  tipo_destino: string;

  @ApiProperty({ example: '2026-03-16' })
  @IsDateString()
  fecha_inicio: string;

  @ApiProperty({ example: '2026-04-15' })
  @IsDateString()
  fecha_termino: string;

  @ApiProperty({ example: 7000, description: 'Monto calculado del viático' })
  @IsNumber()
  monto_calculado: number;

  @ApiPropertyOptional({ example: 'Visita domiciliaria' })
  @IsOptional()
  @IsString()
  justificacion?: string;

  @ApiPropertyOptional({ example: 5000, description: 'Rendición de pasajes o bencina' })
  @IsOptional()
  @IsNumber()
  rendicion_pasajes?: number;

  @ApiPropertyOptional({ enum: EstadoValidacion, example: EstadoValidacion.PENDIENTE })
  @IsOptional()
  @IsEnum(EstadoValidacion)
  estado?: EstadoValidacion;

  @ApiPropertyOptional({ example: 'Notas de viatico' })
  @IsOptional()
  @IsString()
  observaciones?: string;
}
