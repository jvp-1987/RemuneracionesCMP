import { Module } from '@nestjs/common';
import { AusentismosController } from './ausentismos.controller';
import { AusentismosService } from './ausentismos.service';

@Module({
  controllers: [AusentismosController],
  providers: [AusentismosService]
})
export class AusentismosModule {}
