import { Controller, Post, Body, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IngresosService } from './ingresos.service';

@Controller('ingresos')
export class IngresosController {
  constructor(private readonly ingresosService: IngresosService) {}

  @Post('manual')
  @UseInterceptors(FileInterceptor('file'))
  guardarIngresos(@Body() data: any, @UploadedFile() file?: any) {
    // Si viene de FormData, algunos campos podrían ser strings que necesitan parseo
    const payload = typeof data.payload === 'string' ? JSON.parse(data.payload) : data;
    return this.ingresosService.guardarIngresos(payload, file);
  }
}
