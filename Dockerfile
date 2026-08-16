FROM node:24.18.0-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm run build
# We don't use pnpm deploy because it drops local workspace dependencies unless injected
# Instead, we'll keep the workspace structure for production but only install prod deps
RUN pnpm install --frozen-lockfile --prod --config.confirmModulesPurge=false

FROM base AS production-api
WORKDIR /app
COPY --from=build /app/package.json /app/pnpm-workspace.yaml /app/
COPY --from=build /app/apps/api /app/apps/api
COPY --from=build /app/packages /app/packages
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/packages/database/migrations /app/packages/database/migrations
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
WORKDIR /app/apps/api
USER node
CMD ["npm", "start"]

FROM caddy:2.8-alpine AS production-caddy
COPY --from=build /app/apps/web/dist/browser /srv/web
COPY infra/docker/caddy/Caddyfile /etc/caddy/Caddyfile
EXPOSE 80
EXPOSE 443
