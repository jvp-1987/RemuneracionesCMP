import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCentroSaludDto {
  @ApiProperty({ example: 'Cesfam Coñaripe' })
  @IsString()
  @IsNotEmpty()
  nombre: string;
}
