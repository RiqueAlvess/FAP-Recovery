FROM node:20-alpine

# Prisma precisa de openssl/libc6-compat para os engines em Alpine.
RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Valor usado apenas durante build (generate/typecheck); em runtime o
# docker-compose sobrescreve para apontar para o volume persistente.
ENV FAP_DATABASE_URL="file:./dev.db"

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

RUN chmod +x docker/entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["docker/entrypoint.sh"]
