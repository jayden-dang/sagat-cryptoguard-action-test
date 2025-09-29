# Sagat API Backend
FROM oven/bun:1.2.23-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    postgresql-client \
    curl

WORKDIR /app

# Install dependencies - copy from api subdirectory
COPY api/package.json api/bun.lockb ./
RUN bun install --frozen-lockfile

# Copy source code from api subdirectory
COPY api/ .

# Generate database schemas
RUN bun run db:generate

# Create non-root user
RUN addgroup -g 1001 -S sagat && \
    adduser -S sagat -u 1001

# Change ownership
RUN chown -R sagat:sagat /app

# Switch to non-root user
USER sagat

# Expose port
EXPOSE 3000

# Start the API server
CMD ["bun", "run", "src/index.ts"]