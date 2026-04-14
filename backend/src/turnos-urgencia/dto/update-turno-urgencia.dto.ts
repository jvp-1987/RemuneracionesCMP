import { PartialType } from '@nestjs/swagger';
import { CreateTurnoUrgenciaDto } from './create-turno-urgencia.dto';

export class UpdateTurnoUrgenciaDto extends PartialType(CreateTurnoUrgenciaDto) {}
