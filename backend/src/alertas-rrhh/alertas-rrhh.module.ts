import { Module } from '@nestjs/common';
import { AlertasRrhhController } from './alertas-rrhh.controller';
import { AlertasRrhhService } from './alertas-rrhh.service';

@Module({
  controllers: [AlertasRrhhController],
  providers: [AlertasRrhhService]
})
export class AlertasRrhhModule {}
