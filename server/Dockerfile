FROM node:24.13.1-bookworm-slim AS build

ENV DEBIAN_FRONTEND=noninteractive

RUN set -eux; \
  echo "Acquire::http::Pipeline-Depth 0;" > /etc/apt/apt.conf.d/99custom; \
  echo "Acquire::http::No-Cache true;" >> /etc/apt/apt.conf.d/99custom; \
  echo "Acquire::BrokenProxy true;" >> /etc/apt/apt.conf.d/99custom; \
  apt-get update; \
  apt-get install -y --no-install-recommends ca-certificates g++ git make python3; \
  rm -rf /var/lib/apt/lists/*

# Copy project
COPY . /sproot
WORKDIR /sproot
RUN npm ci --workspace=common --workspace=server \
  && npm run build:server \
  && rm -rf /sproot/node_modules \
  && npm ci --workspace=common --workspace=server --omit=dev

FROM node:24.13.1-bookworm-slim

# Copy node production dependencies
COPY --from=build /sproot/node_modules /sproot/node_modules
# Copy over common/server
COPY --from=build /sproot/common/package.json /sproot/common/package.json
COPY --from=build /sproot/common/dist /sproot/common/dist
COPY --from=build /sproot/server/dist /sproot/server/dist
COPY --from=build /sproot/server/static /sproot/server/static
COPY --from=build /sproot/api_spec /sproot/api_spec

# Install PostgreSQL client
ENV DEBIAN_FRONTEND=noninteractive
RUN set -eux; \
  echo "Acquire::http::Pipeline-Depth 0;" > /etc/apt/apt.conf.d/99custom; \
  echo "Acquire::http::No-Cache true;" >> /etc/apt/apt.conf.d/99custom; \
  echo "Acquire::BrokenProxy true;" >> /etc/apt/apt.conf.d/99custom; \
  apt-get update; \
  apt-get install -y --no-install-recommends ca-certificates curl gnupg wget; \
  install -d /usr/share/postgresql-common/pgdg; \
  wget --quiet -O /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc; \
  echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt bookworm-pgdg main" > /etc/apt/sources.list.d/pgdg.list; \
  apt-get update; \
  apt-get install -y --no-install-recommends postgresql-client-18; \
  rm -rf /var/lib/apt/lists/*

# Set this as the project root - api_spec lives a layer below and the server expects to be run from here.
WORKDIR /sproot/server

# Expose app ports
EXPOSE 3000
ENTRYPOINT ["node", "./dist/index.js"]