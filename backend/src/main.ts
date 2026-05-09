import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  app.enableCors({
    origin: [
      process.env.CORS_ORIGIN ?? 'https://remuneracion.apscolab.com',
      'https://api-remuneracion.apscolab.com',
      'https://remuneracionescmp.apscolab.com',
      'http://localhost:3000', 
      'http://localhost:3001', 
      'http://localhost:3005', 
      'http://localhost:4000', 
      'http://localhost:4001'
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('Remuneraciones APS API')
    .setDescription('API para la gestión de remuneraciones de atención primaria de salud')
    .setVersion('1.0')
    .build();
  
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  const port = process.env.PORT || process.env.BACKEND_PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Backend running on port: ${port}`);
}
bootstrap();
