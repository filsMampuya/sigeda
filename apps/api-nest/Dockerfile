FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN set -eux; \
  if [ -f /etc/apt/sources.list.d/debian.sources ]; then \
    sed -i 's|http://deb.debian.org|https://deb.debian.org|g; s|http://security.debian.org|https://security.debian.org|g' /etc/apt/sources.list.d/debian.sources; \
  fi; \
  if [ -f /etc/apt/sources.list ]; then \
    sed -i 's|http://deb.debian.org|https://deb.debian.org|g; s|http://security.debian.org|https://security.debian.org|g' /etc/apt/sources.list; \
  fi; \
  printf 'Acquire::Retries "10";\nAcquire::http::Timeout "60";\nAcquire::https::Timeout "60";\nAcquire::ForceIPv4 "true";\n' > /etc/apt/apt.conf.d/99sigeda-network; \
  apt-get update; \
  apt-get install -y --no-install-recommends openssl ca-certificates; \
  rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY apps/api-nest/package.json apps/api-nest/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/database/package.json packages/database/package.json
RUN npm install

FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN set -eux; \
  if [ -f /etc/apt/sources.list.d/debian.sources ]; then \
    sed -i 's|http://deb.debian.org|https://deb.debian.org|g; s|http://security.debian.org|https://security.debian.org|g' /etc/apt/sources.list.d/debian.sources; \
  fi; \
  if [ -f /etc/apt/sources.list ]; then \
    sed -i 's|http://deb.debian.org|https://deb.debian.org|g; s|http://security.debian.org|https://security.debian.org|g' /etc/apt/sources.list; \
  fi; \
  printf 'Acquire::Retries "10";\nAcquire::http::Timeout "60";\nAcquire::https::Timeout "60";\nAcquire::ForceIPv4 "true";\n' > /etc/apt/apt.conf.d/99sigeda-network; \
  apt-get update; \
  apt-get install -y --no-install-recommends openssl ca-certificates; \
  rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api-nest/node_modules ./apps/api-nest/node_modules
COPY . .
COPY vendor/prisma-client/.prisma/client ./node_modules/.prisma/client
COPY vendor/prisma-client/@prisma/client ./node_modules/@prisma/client
RUN npm run build --workspace @sigeda/shared
RUN npm run build --workspace @sigeda/database
RUN npm run build --workspace @sigeda/api-nest

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
RUN set -eux; \
  if [ -f /etc/apt/sources.list.d/debian.sources ]; then \
    sed -i 's|http://deb.debian.org|https://deb.debian.org|g; s|http://security.debian.org|https://security.debian.org|g' /etc/apt/sources.list.d/debian.sources; \
  fi; \
  if [ -f /etc/apt/sources.list ]; then \
    sed -i 's|http://deb.debian.org|https://deb.debian.org|g; s|http://security.debian.org|https://security.debian.org|g' /etc/apt/sources.list; \
  fi; \
  printf 'Acquire::Retries "10";\nAcquire::http::Timeout "60";\nAcquire::https::Timeout "60";\nAcquire::ForceIPv4 "true";\n' > /etc/apt/apt.conf.d/99sigeda-network; \
  apt-get update; \
  apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    imagemagick \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-fra \
    tesseract-ocr-eng; \
  rm -rf /var/lib/apt/lists/*
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api-nest/node_modules ./apps/api-nest/node_modules
COPY --from=build /app/apps/api-nest/dist ./apps/api-nest/dist
COPY --from=build /app/packages/database/dist ./packages/database/dist
COPY --from=build /app/packages/database/prisma ./packages/database/prisma
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY package.json package-lock.json ./
COPY apps/api-nest/package.json apps/api-nest/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/shared/package.json packages/shared/package.json
EXPOSE 4100
CMD ["sh", "-lc", "npx prisma migrate deploy --schema packages/database/prisma/schema.prisma && node apps/api-nest/dist/main.js"]
