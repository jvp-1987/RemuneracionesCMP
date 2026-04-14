import { PartialType } from '@nestjs/swagger';
import { CreateConsolidadoDto } from './create-consolidado.dto';

export class UpdateConsolidadoDto extends PartialType(CreateConsolidadoDto) {}
