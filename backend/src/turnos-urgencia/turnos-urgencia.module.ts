import { Module } from '@nestjs/common';
import { TurnosUrgenciaController } from './turnos-urgencia.controller';
import { TurnosUrgenciaService } from './turnos-urgencia.service';

import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [TurnosUrgenciaController],
  providers: [TurnosUrgenciaService]
})
export class TurnosUrgenciaModule {}
