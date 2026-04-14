import { IsString, IsNotEmpty, IsEmail, IsOptional, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUsuarioDto {
  @ApiProperty({ example: '12345678-9' })
  @IsString()
  @IsNotEmpty()
  rut: string;

  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'juan.perez@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Nivel 1' })
  @IsString()
  @IsNotEmpty()
  rol_enum: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  centro_salud_id?: number;
}
