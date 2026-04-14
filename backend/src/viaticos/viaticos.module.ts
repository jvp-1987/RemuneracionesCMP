import { Module } from '@nestjs/common';
import { ViaticosController } from './viaticos.controller';
import { ViaticosService } from './viaticos.service';

@Module({
  controllers: [ViaticosController],
  providers: [ViaticosService]
})
export class ViaticosModule {}
