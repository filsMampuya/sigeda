FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api-nest/package.json apps/api-nest/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/database/package.json packages/database/package.json
RUN npm install

FROM node:22-bookworm-slim AS build
WORKDIR /app
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
ARG INSTALL_DOCUMENT_AI_SYSTEM_DEPS=true
ENV NODE_ENV=production
RUN set -eux; \
  if [ "$INSTALL_DOCUMENT_AI_SYSTEM_DEPS" = "true" ]; then \
    for aptFile in /etc/apt/sources.list.d/debian.sources /etc/apt/sources.list; do \
      if [ -f "$aptFile" ]; then \
        sed -i 's|http://|https://|g' "$aptFile"; \
      fi; \
    done; \
    printf 'Acquire::Retries "10";\nAcquire::http::Timeout "60";\nAcquire::https::Timeout "60";\nAcquire::https::Pipeline-Depth "0";\nAcquire::ForceIPv4 "true";\n' > /etc/apt/apt.conf.d/99sigeda-network; \
    export DEBIAN_FRONTEND=noninteractive; \
    aptSuccess=0; \
    for attempt in 1 2 3 4; do \
      if apt-get update && apt-get install -y --no-install-recommends --fix-missing \
        openssl \
        ca-certificates \
        imagemagick \
        poppler-utils \
        tesseract-ocr \
        tesseract-ocr-fra \
        tesseract-ocr-eng; then \
        aptSuccess=1; \
        break; \
      fi; \
      echo "apt attempt ${attempt} failed, retrying in 15s"; \
      rm -rf /var/lib/apt/lists/*; \
      sleep 15; \
    done; \
    if [ "$aptSuccess" -ne 1 ]; then \
      echo "apt installation failed after 4 attempts"; \
      exit 1; \
    fi; \
  else \
    echo "Skipping Document Intelligence system dependencies in image build"; \
  fi; \
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
