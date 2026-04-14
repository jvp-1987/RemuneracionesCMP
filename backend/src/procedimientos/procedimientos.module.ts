import { Module } from '@nestjs/common';
import { ProcedimientosController } from './procedimientos.controller';
import { ProcedimientosService } from './procedimientos.service';

@Module({
  controllers: [ProcedimientosController],
  providers: [ProcedimientosService]
})
export class ProcedimientosModule {}
