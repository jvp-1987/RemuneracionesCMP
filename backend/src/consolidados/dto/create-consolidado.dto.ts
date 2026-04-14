import { IsInt, IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConsolidadoDto {
  @ApiProperty({ example: 1, description: 'ID del Centro de Salud' })
  @IsInt()
  centro_salud_id: number;

  @ApiProperty({ example: 1, description: 'ID del Periodo' })
  @IsInt()
  periodo_id: number;

  @ApiProperty({ example: 'Borrador', description: 'Estado: Borrador, Pend_RRHH, Pend_Finanzas, Aprobado' })
  @IsString()
  @IsNotEmpty()
  estado_actual_enum: string;

  @ApiPropertyOptional({ example: 1, description: 'ID del usuario gestor' })
  @IsOptional()
  @IsInt()
  usuario_gestor_id?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  vb_control_interno?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  vb_finanzas?: boolean;

  @IsOptional()
  fecha_vb_control_interno?: Date;

  @IsOptional()
  firma_vb_control_interno?: string;

  @IsOptional()
  fecha_vb_finanzas?: Date;

  @IsOptional()
  firma_vb_finanzas?: string;
}
