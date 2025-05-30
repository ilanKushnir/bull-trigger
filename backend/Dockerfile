FROM node:22-slim AS builder
WORKDIR /app
COPY . ./
RUN npm ci && npm run build

FROM node:22-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY package*.json ./
RUN npm ci --omit dev
CMD ["node","dist/index.js"] 