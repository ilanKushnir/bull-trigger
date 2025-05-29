#!/usr/bin/env bash

set -e

if [ -f .env ]; then
  echo "[setup] .env already exists. Skipping copy."
else
  cp .env.example .env
  echo "[setup] Copied .env.example -> .env. Fill your keys before running the app."
fi 