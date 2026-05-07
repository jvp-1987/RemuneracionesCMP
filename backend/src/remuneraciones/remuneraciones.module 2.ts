import { Module } from '@nestjs/common';
import { RemuneracionesService } from './remuneraciones.service';
import { RemuneracionesController } from './remuneraciones.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RemuneracionesController],
  providers: [RemuneracionesService],
  exports: [RemuneracionesService],
})
export class RemuneracionesModule {}
