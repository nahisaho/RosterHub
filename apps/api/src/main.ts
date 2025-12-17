import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Global prefix
  const apiPrefix = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  // Swagger/OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('RosterHub API')
    .setDescription('OneRoster Japan Profile 1.2.2 Integration Hub API')
    .setVersion('1.0')
    .addTag('users', 'User entity operations')
    .addTag('orgs', 'Organization entity operations')
    .addTag('classes', 'Class entity operations')
    .addTag('courses', 'Course entity operations')
    .addTag('enrollments', 'Enrollment entity operations')
    .addTag('academicSessions', 'Academic Session entity operations')
    .addTag('demographics', 'Demographic entity operations')
    .addTag('csv', 'CSV import/export operations')
    .addTag('auth', 'Authentication operations')
    .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api-key')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(
    `API documentation available at: http://localhost:${port}/api/docs`,
  );
}
void bootstrap();
