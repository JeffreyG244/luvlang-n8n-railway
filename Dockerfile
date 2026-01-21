# ═══════════════════════════════════════════════════════════════════════════
# LUVLANG MASTERING - Docker Configuration
# ═══════════════════════════════════════════════════════════════════════════
# Build: docker build -t luvlang-mastering .
# Run:   docker run -p 3000:3000 --env-file .env luvlang-mastering
# ═══════════════════════════════════════════════════════════════════════════

FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production

# Production image
FROM base AS runner
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 luvlang

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy application files
COPY --chown=luvlang:nodejs . .

# Remove development files
RUN rm -rf .git .gitignore *.md Dockerfile docker-compose.yml

# Switch to non-root user
USER luvlang

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the server
CMD ["node", "payment-server.js"]
