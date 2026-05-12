import { Module } from '@nestjs/common';
import { ViaticosController } from './viaticos.controller';
import { ViaticosService } from './viaticos.service';

import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [ViaticosController],
  providers: [ViaticosService]
})
export class ViaticosModule {}
