import { Module } from '@nestjs/common';
import { ConsolidadosController } from './consolidados.controller';
import { ConsolidadosService } from './consolidados.service';

@Module({
  controllers: [ConsolidadosController],
  providers: [ConsolidadosService]
})
export class ConsolidadosModule {}
