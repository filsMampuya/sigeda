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
ENV NODE_ENV=production
ENV PRISMA_CLIENT_ENGINE_TYPE=library
ENV PRISMA_CLI_QUERY_ENGINE_TYPE=library
ENV PRISMA_CLI_BINARY_TARGETS=debian-openssl-3.0.x
ENV PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node
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
RUN set -eux; test -f "$PRISMA_QUERY_ENGINE_LIBRARY"
EXPOSE 4100
CMD ["sh", "-lc", "if [ \"${SKIP_PRISMA_MIGRATIONS:-false}\" != \"true\" ]; then npx prisma migrate deploy --schema packages/database/prisma/schema.prisma; else echo 'Skipping prisma migrate deploy'; fi && node apps/api-nest/dist/main.js"]
