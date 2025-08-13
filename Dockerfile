FROM docker.n8n.io/n8nio/n8n:latest

USER root

# Install additional dependencies if needed
RUN apk add --no-cache tini

USER node

WORKDIR /home/node

EXPOSE 5678

CMD ["tini", "--", "n8n", "start"]
