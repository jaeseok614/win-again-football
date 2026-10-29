FROM node:22-alpine
WORKDIR /app
COPY server.cjs ./
USER node
ENV NODE_ENV=production
CMD ["node", "server.cjs"]
