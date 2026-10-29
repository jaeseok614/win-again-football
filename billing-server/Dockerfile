FROM node:22-alpine
WORKDIR /app
COPY server.cjs purchases.cjs google-play.cjs ./
USER node
ENV NODE_ENV=production
CMD ["node", "server.cjs"]
