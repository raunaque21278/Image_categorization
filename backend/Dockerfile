FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5000
ENV UPLOADS_DIR=/data/uploads

EXPOSE 5000

CMD ["node", "src/server.js"]
