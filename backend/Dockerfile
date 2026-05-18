FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build typescript
RUN npm run build

# Default command (overridden in docker-compose for worker)
CMD ["npm", "run", "start:api"]
