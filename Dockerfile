# Multi-stage build for Bun-based FCMS Server
FROM oven/bun:1.1.30-debian AS base

WORKDIR /app

# Install system dependencies required for canvas and Prisma
RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libpixman-1-dev \
    pkg-config \
    python3 \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Dependencies stage
FROM base AS dependencies

COPY package.json yarn.lock ./
# Use yarn for better native module support
RUN yarn install --frozen-lockfile

# Build stage
FROM base AS build

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN yarn prisma generate

# Compile TypeScript
RUN yarn tsc

# Production stage
FROM base AS deploy

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy built application
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=dependencies /app/node_modules ./node_modules

# Generate Prisma client in production environment
RUN yarn prisma generate

# Create data directory for bundle numbers
RUN mkdir -p /app/data && touch /app/data/currentBundleNo

# Create cache directory for labels
RUN mkdir -p /app/cache

# Copy logo if exists (for label generation)
COPY logo.png ./logo.png 2>/dev/null || true

EXPOSE 3000

# Run with Bun using optimized Bun-native server
# Falls back to Express version if needed: CMD ["bun", "dist/src/index.js"]
CMD ["bun", "dist/src/index.bun.js"]
