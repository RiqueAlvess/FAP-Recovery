#!/bin/sh
set -e

echo "==> Aplicando migrations do Prisma em ${FAP_DATABASE_URL}..."
npx prisma migrate deploy

DB_PATH="${FAP_DATABASE_URL#file:}"
DB_DIR="$(dirname "$DB_PATH")"
SEED_MARKER="${DB_DIR}/.seeded"

if [ ! -f "$SEED_MARKER" ]; then
  echo "==> Primeira execução: rodando seed inicial..."
  npx prisma db seed
  touch "$SEED_MARKER"
else
  echo "==> Seed já aplicado anteriormente, pulando."
fi

echo "==> Iniciando Next.js..."
exec npm run start -- -p 3000 -H 0.0.0.0
