import { Module } from '@nestjs/common';
import { AtrasosController } from './atrasos.controller';
import { AtrasosService } from './atrasos.service';

import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [AtrasosController],
  providers: [AtrasosService]
})
export class AtrasosModule {}
