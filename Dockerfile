# T14 - Production Docker Image
#
# Multi-stage on purpose. The build stage needs Node, npm and the full source
# tree; the runtime stage needs none of that. Shipping one image that contains
# the toolchain would mean shipping a compiler, a package manager and every dev
# dependency to production - a much larger attack surface than a static file
# server needs. Only the built `dist/` crosses the stage boundary.

# ---------------------------------------------------------------------------
# Stage 1: build the Vite site
# ---------------------------------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /app

# Copy the manifests first so this layer is cached until a dependency actually
# changes. Copying the whole tree first would invalidate the install on every
# source edit.
COPY team-site/package.json team-site/package-lock.json ./

# `npm ci` installs strictly from the lockfile and fails if package.json and the
# lockfile disagree. `npm install` would silently resolve newer versions and the
# image would stop matching what CI tested.
RUN npm ci

COPY team-site/ ./

# Public build-time configuration. These are safe as ARG/ENV: they are values we
# would happily print on the page anyway.
ARG VITE_PUBLIC_URL=""
ARG VITE_PUBLIC_DEPLOY_LABEL=""
ARG GITHUB_SHA=""
ARG GITHUB_RUN_ID=""
ENV VITE_PUBLIC_URL=$VITE_PUBLIC_URL \
    VITE_PUBLIC_DEPLOY_LABEL=$VITE_PUBLIC_DEPLOY_LABEL \
    GITHUB_SHA=$GITHUB_SHA \
    GITHUB_RUN_ID=$GITHUB_RUN_ID

# The Web3Forms access key is mounted as a build secret rather than passed as
# ARG/ENV. It still ends up inside the bundle - Web3Forms posts from the browser,
# so it has to - but ARG and ENV values persist in image metadata and are
# readable with `docker history` by anyone who can pull the image. A secret mount
# exists only for the lifetime of this RUN and leaves no trace in any layer, so
# the value is exposed exactly once, where it is unavoidable, instead of twice.
#
# `npm run build` is `tsc --noEmit && vite build`, then the postbuild generators
# write /health, /status, /api/weather and /api/contact into dist/.
RUN --mount=type=secret,id=web3forms \
    VITE_WEB3FORMS_ACCESS_KEY="$(cat /run/secrets/web3forms 2>/dev/null || echo '')" \
    npm run build

# ---------------------------------------------------------------------------
# Stage 2: serve the built site
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

# Listens on 8080 to match APP_PORT. A port above 1024 needs no privileged bind,
# so the container never requires extra capabilities just to open its socket.
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Only the build output crosses over. No node_modules, no source, no toolchain.
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
