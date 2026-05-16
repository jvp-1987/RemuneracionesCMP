import { Module } from '@nestjs/common';
import { RelojControlService } from './reloj-control.service';
import { RelojControlController } from './reloj-control.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [RelojControlService],
  controllers: [RelojControlController]
})
export class RelojControlModule {}
