# Sagat API Backend
FROM oven/bun:1.2.23 AS base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies - copy from api subdirectory
COPY api/package.json api/bun.lockb ./
RUN bun install --frozen-lockfile

# Copy source code from api subdirectory
COPY api/ .

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