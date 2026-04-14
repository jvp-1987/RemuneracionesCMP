import { PartialType } from '@nestjs/swagger';
import { CreateAtrasoDto } from './create-atraso.dto';

export class UpdateAtrasoDto extends PartialType(CreateAtrasoDto) {}
