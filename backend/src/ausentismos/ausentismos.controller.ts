import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { AusentismosService } from './ausentismos.service';
import { ExternalAusentismoDto } from './dto/external-ausentismo.dto';

@Controller('ausentismos')
export class AusentismosController {
  constructor(private readonly ausentismosService: AusentismosService) {}

  @Post()
  create(@Body() createData: any) {
    return this.ausentismosService.create(createData);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.CREATED)
  async handleWebhook(@Body() externalDto: ExternalAusentismoDto) {
    try {
      const result = await this.ausentismosService.processWebhook(externalDto);
      return { status: 'success', message: 'Ausentismo registrado correctamente', data: result };
    } catch (error: any) {
      return { status: 'error', message: error.message };
    }
  }

  @Get()
  findAll() {
    return this.ausentismosService.findAll();
  }

  @Get('funcionario/:rut')
  findByFuncionario(@Param('rut') rut: string) {
    return this.ausentismosService.findByFuncionario(rut);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any) {
    return this.ausentismosService.update(+id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ausentismosService.remove(+id);
  }
}
