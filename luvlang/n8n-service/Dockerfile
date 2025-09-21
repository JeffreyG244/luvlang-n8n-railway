FROM n8nio/n8n:latest

# Set platform
ENV DOCKER_PLATFORM=linux/amd64

# Set Railway-specific environment
ENV N8N_HOST=0.0.0.0
ENV N8N_PORT=8080
ENV N8N_PROTOCOL=https
ENV DB_TYPE=sqlite
ENV WEBHOOK_URL=https://luvlang-n8n-production.up.railway.app

# Create n8n directory
USER root
RUN mkdir -p /home/node/.n8n && chown node:node /home/node/.n8n

# Copy workflow files
COPY workflows/ /home/node/.n8n/

# Switch back to node user
USER node

# Expose Railway port
EXPOSE 8080

# Start n8n
CMD ["n8n"]