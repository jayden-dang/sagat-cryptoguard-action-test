# Sagat API Backend
FROM oven/bun:1.2.23 AS base

# Install system dependencies including postgres drivers
RUN apt-get update && apt-get install -y \
    postgresql-client \
    libpq-dev \
    python3 \
    python3-pip \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies - copy from api subdirectory
COPY api/package.json api/bun.lockb ./
RUN bun install --frozen-lockfile

# Explicitly install pg driver and postgres package to ensure native modules are properly linked
RUN bun add pg postgres

# Copy source code from api subdirectory
COPY api/ .

# Generate database schemas
RUN bun run db:generate

# Create non-root user
RUN groupadd -g 1001 sagat && \
    useradd -r -u 1001 -g sagat sagat

# Change ownership
RUN chown -R sagat:sagat /app

# Switch to non-root user
USER sagat

# Expose port
EXPOSE 3000

# Start the API server
CMD ["bun", "run", "src/index.ts"]