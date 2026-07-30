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

FROM node:22-bookworm
ARG INSTALL_DOCUMENT_AI_SYSTEM_DEPS=false
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
WORKDIR /app
ENV NODE_ENV=production
ENV HTTP_PROXY=${HTTP_PROXY}
ENV HTTPS_PROXY=${HTTPS_PROXY}
ENV NO_PROXY=${NO_PROXY}
ENV PRISMA_CLIENT_ENGINE_TYPE=library
ENV PRISMA_CLI_QUERY_ENGINE_TYPE=library
ENV PRISMA_CLI_BINARY_TARGETS=debian-openssl-3.0.x
ENV PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node
RUN set -eux; \
  if [ "$INSTALL_DOCUMENT_AI_SYSTEM_DEPS" = "true" ]; then \
    export DEBIAN_FRONTEND=noninteractive; \
    for aptFile in /etc/apt/sources.list.d/debian.sources /etc/apt/sources.list; do \
      if [ -f "$aptFile" ]; then \
        sed -i 's|http://|https://|g' "$aptFile"; \
      fi; \
    done; \
    printf 'Acquire::Retries "10";\nAcquire::http::Timeout "60";\nAcquire::https::Timeout "60";\nAcquire::https::Pipeline-Depth "0";\nAcquire::ForceIPv4 "true";\n' > /etc/apt/apt.conf.d/99sigeda-network; \
    aptSuccess=0; \
    for attempt in 1 2 3 4; do \
      if apt-get update && apt-get install -y --no-install-recommends --fix-missing \
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
    rm -rf /var/lib/apt/lists/*; \
  fi
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api-nest/node_modules ./apps/api-nest/node_modules
COPY --from=build /app/apps/api-nest/dist ./apps/api-nest/dist
COPY --from=build /app/packages/database/dist ./packages/database/dist
COPY --from=build /app/packages/database/prisma ./packages/database/prisma
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY vendor/prisma-client/.prisma/client ./node_modules/.prisma/client
COPY vendor/prisma-client/@prisma/client ./node_modules/@prisma/client
COPY package.json package-lock.json ./
COPY apps/api-nest/package.json apps/api-nest/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN set -eux; \
  test -f "$PRISMA_QUERY_ENGINE_LIBRARY"; \
  test -f /usr/lib/x86_64-linux-gnu/libssl.so.3 || test -f /lib/x86_64-linux-gnu/libssl.so.3
EXPOSE 4100
CMD ["sh", "-lc", "if [ \"${SKIP_PRISMA_MIGRATIONS:-false}\" != \"true\" ]; then npx prisma migrate deploy --schema packages/database/prisma/schema.prisma; else echo 'Skipping prisma migrate deploy'; fi && node apps/api-nest/dist/main.js"]
