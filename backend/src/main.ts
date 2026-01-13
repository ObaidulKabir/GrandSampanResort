import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(4000);
  // eslint-disable-next-line no-console
  console.log('API running at http://localhost:4000');
}
bootstrap();

