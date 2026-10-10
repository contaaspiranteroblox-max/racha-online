# Para hospedagens com Docker (Fly.io, Koyeb, um VPS…). Não precisa de npm install: o servidor não tem dependências.
FROM node:22-alpine
WORKDIR /app
COPY server.js package.json ./
COPY public ./public
ENV PORT=8080 DATA_DIR=/app/data
EXPOSE 8080
CMD ["node", "server.js"]
