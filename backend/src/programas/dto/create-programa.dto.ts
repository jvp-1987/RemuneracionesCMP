import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProgramaDto {
  @ApiProperty({ example: 'Programa Odontológico' })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ example: 'Presupuestaria' })
  @IsString()
  @IsNotEmpty()
  categoria_enum: string;
}
