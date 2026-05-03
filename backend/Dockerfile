# Build stage
FROM node:22-alpine AS builder

# Create app directory
WORKDIR /app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./
COPY prisma ./prisma/

# Install app dependencies
RUN npm ci

# Copy app source code
COPY . .

# Generate Prisma Client and build Nest application
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:22-alpine AS production

# Install openssl for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Expose port and start application
EXPOSE 3000

# Required for Prisma Client to start in the alpine image. 
# Also running migrate deploy to ensure DB is up to date on start.
CMD npx prisma migrate deploy && npm run start:prod
