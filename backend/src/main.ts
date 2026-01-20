import "reflect-metadata";
import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");
  const host = process.env.DOMAIN || "localhost";
  app.enableCors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      `http://${host}`,
      `http://${host}`,
    ],
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
  await app.listen(port);
  console.log(`API running at http://localhost:${port}/api`);
}
bootstrap();
