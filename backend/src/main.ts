import 'reflect-metadata';
import 'dotenv/config';
import { join } from 'path';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const corsOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3010',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3010',
    'https://www.grandsampanresort.com',
    'https://grandsampanresort.com'
  ];
  app.enableCors({ origin: corsOrigins, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  // Mount static uploads BEFORE the global /api prefix so files stay at
  // /uploads/... (not /api/uploads/...), matching URLs stored in MediaAsset.
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });
  app.setGlobalPrefix('api');
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
  await app.listen(port);
  console.log(`API running at http://localhost:${port}`);
}
bootstrap();

