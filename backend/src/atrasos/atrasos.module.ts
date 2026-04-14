import { Module } from '@nestjs/common';
import { AtrasosController } from './atrasos.controller';
import { AtrasosService } from './atrasos.service';

@Module({
  controllers: [AtrasosController],
  providers: [AtrasosService]
})
export class AtrasosModule {}
