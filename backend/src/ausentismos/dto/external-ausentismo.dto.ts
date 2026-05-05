import { IsString, IsNotEmpty, IsDateString, IsNumber, IsBoolean, IsOptional } from 'class-validator';

export class ExternalAusentismoDto {
  @IsString()
  @IsNotEmpty()
  rut_funcionario: string;

  @IsString()
  @IsNotEmpty()
  tipo_permiso: string;

  @IsDateString()
  fecha_inicio: string;

  @IsDateString()
  fecha_termino: string;

  @IsNumber()
  dias_habiles: number;

  @IsBoolean()
  @IsOptional()
  descuento_aplicable?: boolean;

  @IsString()
  @IsOptional()
  estado?: string;
}
