# Para hospedagens com Docker (Fly.io, Koyeb, um VPS…). O servidor não tem dependências.
FROM node:22-alpine
WORKDIR /app
COPY server.js package.json ./
COPY server ./server
COPY app/public ./app/public
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
