import { Module } from '@nestjs/common';
import { ConsolidadosController } from './consolidados.controller';
import { MigrateController } from './migrate.controller';
import { ConsolidadosService } from './consolidados.service';

@Module({
  controllers: [ConsolidadosController, MigrateController],
  providers: [ConsolidadosService]
})
export class ConsolidadosModule {}
