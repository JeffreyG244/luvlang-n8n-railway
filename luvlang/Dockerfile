# Use minimal Node.js runtime
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Only copy what we need
COPY package.json ./
COPY server.js ./
COPY dist ./dist

# Install only express (minimal dependencies)
RUN npm install express

# Expose port
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]