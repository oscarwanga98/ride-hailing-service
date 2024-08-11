FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3001

ENV REDIS_HOST=redis
ENV REDIS_PORT=6379
ENV RABBITMQ_URL=amqp://rabbitmq

CMD ["node", "driver-service.js"]
