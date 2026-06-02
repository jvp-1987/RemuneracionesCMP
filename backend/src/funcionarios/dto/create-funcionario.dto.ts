import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFuncionarioDto {
  @ApiProperty({ example: '12345678-9' })
  @IsString()
  @IsNotEmpty()
  rut: string;

  @ApiProperty({ example: 'María Silva' })
  @IsString()
  @IsNotEmpty()
  nombre_completo: string;

  @ApiProperty({ example: 'Médico' })
  @IsString()
  @IsNotEmpty()
  profesion_enum: string;

  @ApiProperty({ example: 'A', required: false })
  @IsString()
  categoria_aps?: string;

  @ApiProperty({ example: 1, required: false })
  nivel_aps?: number;

  @ApiProperty({ example: 44, required: false })
  jornada_horas?: number;

  @ApiProperty({ example: 1, required: false })
  centro_salud_id?: number;

  @ApiProperty({ example: true, required: false })
  activo?: boolean;
}
