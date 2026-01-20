# ─── Base Stage ─────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# ─── Development Stage ──────────────────────────────────────────
FROM base AS development
RUN npm install
COPY . .
RUN chmod +x docker-entrypoint.sh
ENV NODE_ENV=development
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "run", "dev"]

# ─── Production Build Stage ─────────────────────────────────────
FROM base AS builder
RUN npm ci
COPY . . 
RUN npm run build

# ─── Production Stage ───────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
ENV NODE_ENV=production
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
