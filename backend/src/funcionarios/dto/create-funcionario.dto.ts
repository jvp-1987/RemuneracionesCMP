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
}
