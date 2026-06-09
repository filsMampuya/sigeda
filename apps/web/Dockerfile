FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm install

FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV SIGEDA_API_URL=http://api-nest:4100
ENV NEXT_PUBLIC_SIGEDA_API_URL=http://localhost:4100
ENV SIGEDA_ON_PREMISE_API_URL=http://api-nest:4100/api/v1
ENV NEXT_PUBLIC_SIGEDA_ON_PREMISE_API_URL=http://localhost:4100/api/v1
ENV KEYCLOAK_URL=http://localhost:8080
ENV KEYCLOAK_INTERNAL_URL=http://keycloak:8080
ENV KEYCLOAK_REALM=sigeda
ENV KEYCLOAK_CLIENT_ID=sigeda-web
ENV NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8080
ENV NEXT_PUBLIC_KEYCLOAK_REALM=sigeda
ENV NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=sigeda-web
RUN npm run build --workspace @sigeda/shared
RUN npm run build --workspace @sigeda/web

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/web/.next ./apps/web/.next
COPY --from=build /app/apps/web/package.json ./apps/web/package.json
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY package.json package-lock.json ./
EXPOSE 3000
CMD ["npm", "run", "start", "--workspace", "@sigeda/web"]
