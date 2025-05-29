// @ts-nocheck
import Fastify from 'fastify';
import envPlugin from '@fastify/env';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';

const envSchema = {
  type: 'object',
  required: ['PORT'],
  properties: {
    PORT: { type: 'string', default: '3000' },
    NODE_ENV: { type: 'string', default: 'development' }
  }
};

export const buildServer = async () => {
  const fastify = Fastify({ logger: true });

  await fastify.register(envPlugin, { schema: envSchema, dotenv: true, data: process.env });

  await fastify.register(helmet);
  await fastify.register(sensible);

  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Bull Trigger API',
        version: '0.1.0'
      }
    }
  });
  await fastify.register(swaggerUi, {
    routePrefix: '/docs/api'
  });

  fastify.get('/healthz', async () => ({ status: 'ok' }));

  return fastify;
};

export const start = async () => {
  const server = await buildServer();
  await server.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' });
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  // executed directly via tsx node
  start().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} 