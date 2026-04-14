import { Module } from '@nestjs/common';
import { TurnosUrgenciaController } from './turnos-urgencia.controller';
import { TurnosUrgenciaService } from './turnos-urgencia.service';

@Module({
  controllers: [TurnosUrgenciaController],
  providers: [TurnosUrgenciaService]
})
export class TurnosUrgenciaModule {}
