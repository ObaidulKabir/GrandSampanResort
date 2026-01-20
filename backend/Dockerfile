FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV NODE_ENV=development
RUN chmod +x docker-entrypoint.sh


ENTRYPOINT ["./docker-entrypoint.sh"]
EXPOSE 4000
CMD ["npm","run","dev"]
