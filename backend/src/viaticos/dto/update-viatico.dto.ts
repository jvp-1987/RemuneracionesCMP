import { PartialType } from '@nestjs/swagger';
import { CreateViaticoDto } from './create-viatico.dto';

export class UpdateViaticoDto extends PartialType(CreateViaticoDto) {}
