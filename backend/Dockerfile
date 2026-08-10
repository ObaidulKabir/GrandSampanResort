FROM node:20-alpine AS base
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
COPY . .
# Generate after full copy so committed prisma/generated cannot overwrite a fresh client.
# prisma.config.ts requires DATABASE_URL even for generate.
ENV DATABASE_URL=postgresql://app:app@db:5432/grand_sampan
RUN npx prisma generate

FROM base AS development
ENV NODE_ENV=development
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy || echo 'prisma migrate deploy failed, continuing startup'; npm run dev"]

FROM base AS production
ENV NODE_ENV=production
RUN npm run build
EXPOSE 4000
# Never let a migration failure (e.g. an existing DB whose schema predates
# migration history tracking) block the app from starting; log and continue.
CMD ["sh", "-c", "npx prisma migrate deploy || echo 'prisma migrate deploy failed, continuing startup'; node dist/src/main.js"]
