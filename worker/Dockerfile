FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV UPLOADS_DIR=/data/uploads
ENV HOST=0.0.0.0

CMD ["node", "worker.js"]
