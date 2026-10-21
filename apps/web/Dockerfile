# Production image for apps/web: the standalone server (`output: "standalone"` in next.config.ts).
# NEXT_PUBLIC_* values are inlined at build time, so they come in as build args.

FROM node:22-alpine AS deps
WORKDIR /srv/web
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /srv/web
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

ARG NEXT_PUBLIC_API_MODE
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_HCAPTCHA_SITE_KEY
ENV NEXT_PUBLIC_API_MODE=$NEXT_PUBLIC_API_MODE \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_HCAPTCHA_SITE_KEY=$NEXT_PUBLIC_HCAPTCHA_SITE_KEY

COPY --from=deps /srv/web/node_modules ./node_modules
COPY . .
# The webpack cache (300+ MB) is only for the next build on this machine; nothing below copies it
RUN npm run build && rm -rf .next/cache

FROM node:22-alpine AS runner
WORKDIR /srv/web
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# server.js with next.config.ts already applied and the node_modules it traced; static files and public are not in the
# standalone folder, so they are copied next to it. Everything is the node user's, so .next stays writable.
COPY --from=builder --chown=node:node /srv/web/.next/standalone ./
COPY --from=builder --chown=node:node /srv/web/.next/static ./.next/static
COPY --from=builder --chown=node:node /srv/web/public ./public

USER node
EXPOSE 3000
CMD ["node", "server.js"]
