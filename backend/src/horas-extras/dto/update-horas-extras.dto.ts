import { PartialType } from '@nestjs/swagger';
import { CreateHorasExtrasDto } from './create-horas-extras.dto';

export class UpdateHorasExtrasDto extends PartialType(CreateHorasExtrasDto) {}
