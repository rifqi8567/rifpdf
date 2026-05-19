FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Optimize Node.js memory usage for 2GB VPS
ENV NODE_OPTIONS="--max-old-space-size=256"

CMD ["npm", "run", "start:api"]
