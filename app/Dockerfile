# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Stage 1 — build the static Vite/React bundle
# ---------------------------------------------------------------------------
FROM node:20.18-alpine3.20 AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci || npm install

COPY . .
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2 — serve the bundle with nginx, running as a non-root user
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

# nginx:alpine already ships an unprivileged "nginx" user/group (uid/gid 101).
# Re-point nginx's writable paths at locations that user can own, drop the
# `user` directive (only meaningful when master starts as root), and hand
# ownership of everything nginx touches at runtime to that user.
RUN sed -i '/^user  *nginx;/d' /etc/nginx/nginx.conf \
  && mkdir -p /tmp/client_temp /tmp/proxy_temp /tmp/fastcgi_temp /tmp/uwsgi_temp /tmp/scgi_temp \
  && chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx /tmp

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/dist /usr/share/nginx/html

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
