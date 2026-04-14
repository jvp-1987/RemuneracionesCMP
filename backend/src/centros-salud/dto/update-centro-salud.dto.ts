import { PartialType } from '@nestjs/swagger';
import { CreateCentroSaludDto } from './create-centro-salud.dto';

export class UpdateCentroSaludDto extends PartialType(CreateCentroSaludDto) {}
