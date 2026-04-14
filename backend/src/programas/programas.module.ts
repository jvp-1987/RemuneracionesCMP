import { Module } from '@nestjs/common';
import { ProgramasController } from './programas.controller';
import { ProgramasService } from './programas.service';

@Module({
  controllers: [ProgramasController],
  providers: [ProgramasService]
})
export class ProgramasModule {}
