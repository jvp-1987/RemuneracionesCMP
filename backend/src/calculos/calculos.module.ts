import { Module } from '@nestjs/common';
import { CalculosService } from './calculos.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CalculosService],
  exports: [CalculosService],
})
export class CalculosModule {}
