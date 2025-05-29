// @ts-nocheck
import Fastify from 'fastify';
import fastifyEnv from '@fastify/env';
import fs from 'fs';
import dotenvSafe from 'dotenv-safe';
import { getNowIso } from '@crypto-kush/common';
import path from 'path';

function loadEnv() {
  const backendDir = process.cwd();
  const rootDir = fs.existsSync(`${backendDir}/../.env`)
    ? path.resolve(backendDir, '..')
    : backendDir;
  const exampleFile = fs.existsSync(path.join(backendDir, '.env.example'))
    ? path.join(backendDir, '.env.example')
    : path.join(rootDir, '.env.example');

  // Ensure .env file is read correctly
  process.chdir(rootDir);
  dotenvSafe.config({ example: exampleFile, allowEmptyValues: true });
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

const buildServer = async () => {
  const fastify = Fastify({ logger: true });
  //@ts-ignore
  await fastify.register(fastifyEnv, { schema: envSchema, data: process.env, dotenv: false });
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