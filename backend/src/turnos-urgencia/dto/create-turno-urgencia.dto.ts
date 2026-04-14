import { IsInt, IsString, IsNotEmpty, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTurnoUrgenciaDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  consolidado_id: number;

  @ApiProperty({ example: '12345678-9' })
  @IsString()
  @IsNotEmpty()
  funcionario_rut: string;

  @ApiProperty({ example: 3, description: 'Cantidad de turnos en día hábil' })
  @IsInt()
  cant_turnos_habiles: number;

  @ApiProperty({ example: 2, description: 'Cantidad de turnos en día inhábil' })
  @IsInt()
  cant_turnos_inhabiles: number;

  @ApiProperty({ example: '2026-03-16' })
  @IsDateString()
  fecha_inicio: string;

  @ApiProperty({ example: '2026-04-15' })
  @IsDateString()
  fecha_termino: string;

  @ApiProperty({ example: 150000, description: 'Monto calculado' })
  @IsNumber()
  monto_calculado: number;
}
