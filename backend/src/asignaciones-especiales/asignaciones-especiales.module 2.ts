import { Module } from '@nestjs/common';
import { AsignacionesEspecialesController } from './asignaciones-especiales.controller';
import { AsignacionesEspecialesService } from './asignaciones-especiales.service';

@Module({
  controllers: [AsignacionesEspecialesController],
  providers: [AsignacionesEspecialesService]
})
export class AsignacionesEspecialesModule {}
