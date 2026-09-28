FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN apk add --no-cache --virtual .build python3 make g++ \
  && npm ci --omit=dev \
  && apk del .build

COPY src ./src
COPY public ./public

RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "src/server.js"]
