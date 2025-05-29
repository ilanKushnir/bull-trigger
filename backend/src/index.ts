import Fastify from 'fastify';
import fp from 'fastify-plugin';
import fs from 'fs';
import dotenvSafe from 'dotenv-safe';
import { getNowIso } from '@crypto-kush/common';

function loadEnv() {
  dotenvSafe.config({ example: '.env.example', allowEmptyValues: true });
  if (!process.env.OPENAI_KEY) {
    try {
      const secret = fs.readFileSync('/run/secrets/openai_key', 'utf8').trim();
      process.env.OPENAI_KEY = secret;
    } catch (_) {}
  }
}

loadEnv();

const envSchema = {
  type: 'object',
  required: ['OPENAI_KEY'],
  properties: {
    OPENAI_KEY: { type: 'string' },
    PORT: { type: 'string', default: '3000' }
  }
};

async function envPlugin(fastify: Fastify.FastifyInstance) {
  //@ts-ignore
  await fastify.register(import('fastify-env'), {
    schema: envSchema,
    data: process.env,
    dotenv: false
  });
}

const buildServer = async () => {
  const fastify = Fastify({ logger: true });
  await fastify.register(fp(envPlugin));
  fastify.get('/health', async () => ({ status: 'ok' }));
  fastify.get('/time', async () => ({ now: getNowIso() }));
  return fastify;
};

const start = async () => {
  const server = await buildServer();
  try {
    await server.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  start();
}

export default buildServer; 