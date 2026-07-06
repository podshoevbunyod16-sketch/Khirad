#!/bin/bash
set -e

echo "==> Installing root dependencies..."
yarn install

echo "==> Installing frontend dependencies..."
cd frontend
yarn install
echo "==> Building frontend..."
yarn build

echo "==> Installing backend dependencies..."
cd ../backend
yarn install

echo "==> Generating Prisma client..."
npx prisma generate

echo "==> Pushing database schema..."
DATABASE_URL="file:./prod.db" npx prisma db push --skip-generate --accept-data-loss

echo "==> Build complete!"
