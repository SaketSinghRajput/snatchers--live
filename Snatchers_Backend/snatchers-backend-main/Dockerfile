# Multi-stage Dockerfile for Node.js application

# Base stage with Node.js
FROM node:18-alpine AS base
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    curl \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Dependencies stage
FROM base AS dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Development stage
FROM base AS development
COPY package*.json ./
RUN npm ci && npm cache clean --force
COPY . .
USER nodejs
EXPOSE 5000
CMD ["dumb-init", "node", "server.js"]

# Build stage (if you have build steps)
FROM dependencies AS build
COPY . .
# Add any build commands here if needed
# RUN npm run build

# Production stage
FROM base AS production

# Copy production dependencies
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs . .

# Create necessary directories
RUN mkdir -p logs uploads temp backups && \
    chown -R nodejs:nodejs logs uploads temp backups

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Security: Use non-root user
USER nodejs

# Expose port
EXPOSE 5000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]

# Labels for metadata
LABEL maintainer="Snatchers Team"
LABEL version="1.0.0"
LABEL description="Snatchers E-commerce Backend API"