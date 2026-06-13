import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { json, urlencoded } from "express";
import { AppModule } from "./modules/app.module.js";

const port = Number.parseInt(process.env.PORT ?? "4100", 10);
const bodyLimit = process.env.HTTP_BODY_LIMIT ?? "10mb";
const corsOrigins =
  process.env.CORS_ORIGIN?.split(",").map((item) => item.trim()).filter(Boolean) ?? [
    "http://localhost:8088",
    "http://localhost:3000"
  ];

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api/v1");
  app.use(
    helmet({
      crossOriginResourcePolicy: false
    })
  );
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ extended: true, limit: bodyLimit }));
  app.enableCors({
    origin: corsOrigins,
    credentials: true
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true
      }
    })
  );
  await app.listen(port);
}

void bootstrap();
