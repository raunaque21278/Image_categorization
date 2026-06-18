FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

RUN mkdir -p uploads

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV UPLOADS_DIR=/tmp/uploads

EXPOSE 5000

CMD ["node", "src/server.js"]
