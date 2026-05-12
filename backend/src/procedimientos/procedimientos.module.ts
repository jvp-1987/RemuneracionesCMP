import { Module } from '@nestjs/common';
import { ProcedimientosController } from './procedimientos.controller';
import { ProcedimientosService } from './procedimientos.service';

import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [ProcedimientosController],
  providers: [ProcedimientosService]
})
export class ProcedimientosModule {}
