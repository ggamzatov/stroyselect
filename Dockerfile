FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NODE_ENV=production
# Next.js imports server modules while collecting route metadata during build.
# These non-secret placeholders satisfy fail-fast configuration checks only;
# the real values are injected into the runtime container by the deployment.
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ENV S3_ENDPOINT=http://127.0.0.1:9000
ENV S3_REGION=ru-1
ENV S3_ACCESS_KEY=build-placeholder
ENV S3_SECRET_KEY=build-placeholder
ENV S3_FORCE_PATH_STYLE=true
ENV APP_BASE_URL=https://build.invalid
ENV NEXT_PUBLIC_APP_URL=https://build.invalid
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
