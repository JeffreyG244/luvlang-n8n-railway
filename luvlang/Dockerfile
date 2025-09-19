# Use Node.js 20 LTS for better compatibility
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install ALL dependencies including dev dependencies for build
RUN npm ci

# Copy all source files
COPY . .

# Remove any conflicting files that might exist
RUN rm -rf website-files/ || true
RUN rm -f nixpacks.toml || true

# Build the application
RUN npm run build

# Expose port (Railway automatically sets PORT env var)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]