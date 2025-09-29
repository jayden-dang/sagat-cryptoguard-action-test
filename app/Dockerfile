# Sagat Frontend
FROM oven/bun:1.2.23-alpine AS base

# Install system dependencies
RUN apk add --no-cache curl

WORKDIR /app

# Install dependencies - copy from app subdirectory
COPY app/package.json app/bun.lockb ./
RUN bun install --frozen-lockfile

# Copy source code from app subdirectory
COPY app/ .

# Development stage - don't build yet
FROM base AS development
# Vite dev server will be started by docker-compose command

# Build stage for production
FROM development AS build
RUN bun run build

# Production stage with nginx
FROM nginx:alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S sagat && \
    adduser -S sagat -u 1001

# Copy built app to nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Change ownership of nginx html directory
RUN chown -R sagat:sagat /usr/share/nginx/html

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]