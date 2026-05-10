FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

FROM base AS development
ENV NODE_ENV=development
EXPOSE 4000
CMD ["npm", "run", "dev"]

FROM base AS production
ENV NODE_ENV=production
RUN npm run build
EXPOSE 4000
CMD ["npm", "start"]
