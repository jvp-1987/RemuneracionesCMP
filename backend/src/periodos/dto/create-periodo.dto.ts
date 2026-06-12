import { IsInt, IsString, IsNotEmpty, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePeriodoDto {
  @ApiProperty({ example: 4, description: 'Mes del periodo (1-12)' })
  @IsInt()
  @Min(1)
  @Max(12)
  mes: number;

  @ApiProperty({ example: 2026, description: 'Año del periodo' })
  @IsInt()
  anio: number;

  @ApiProperty({ example: 'Abierto', description: 'Estado del periodo: Abierto o Cerrado' })
  @IsString()
  @IsNotEmpty()
  estado: string;

  @ApiProperty({ example: 'ORDINARIO', description: 'Tipo de periodo (ORDINARIO / SUPLEMENTARIO)', required: false })
  @IsString()
  @IsOptional()
  tipo?: string;

  @ApiProperty({ example: 1, description: 'ID del periodo padre si es suplementario', required: false })
  @IsInt()
  @IsOptional()
  parent_id?: number;
}
