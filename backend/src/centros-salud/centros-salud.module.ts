import { Module } from '@nestjs/common';
import { CentrosSaludController } from './centros-salud.controller';
import { CentrosSaludService } from './centros-salud.service';

@Module({
  controllers: [CentrosSaludController],
  providers: [CentrosSaludService]
})
export class CentrosSaludModule {}
