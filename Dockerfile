# syntax=docker/dockerfile:1
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts/migrate.mjs ./scripts/migrate.mjs

# One-shot seeding stage. Builds from `builder` so tsx + source + dev deps are
# available. Runs scripts/staging-seed.ts (idempotent). Kept separate from
# `runner` so no source/devDeps leak into the runtime image.
FROM builder AS seed
ENV NODE_ENV=production
CMD ["node_modules/.bin/tsx", "scripts/staging-seed.ts"]

# Never ship env files that Next may copy into the standalone output.
RUN rm -f .env .env.local .env.development .env.production .env.staging

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
