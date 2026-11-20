FROM node:20-alpine

RUN apk add --no-cache curl \
  && addgroup -S kongali \
  && adduser -S kongali -G kongali

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY iso20022-validator.js kongali1720-sovereignty-gateway.js ./

USER kongali

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8443

EXPOSE 8443

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8443/health || exit 1

CMD ["node", "kongali1720-sovereignty-gateway.js"]
