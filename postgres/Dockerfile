FROM postgres:18-bookworm

ARG TIMESCALEDB_LOADER_VERSION=2.26.4~debian12-1803
ARG TIMESCALEDB_VERSION=2.26.4~debian12-1803
ARG TIMESCALEDB_TOOLKIT_VERSION=1:1.22.0~debian12

RUN set -eux; \
  apt-get update; \
  apt-get install -y --no-install-recommends ca-certificates curl gnupg; \
  install -d /usr/share/postgresql-common/pgdg; \
  curl -fsSL https://packagecloud.io/timescale/timescaledb/gpgkey \
    | gpg --dearmor -o /usr/share/postgresql-common/pgdg/timescale.gpg; \
  echo 'deb [signed-by=/usr/share/postgresql-common/pgdg/timescale.gpg] https://packagecloud.io/timescale/timescaledb/debian/ bookworm main' \
    > /etc/apt/sources.list.d/timescaledb.list; \
  apt-get update; \
  apt-get install -y --no-install-recommends \
    timescaledb-2-loader-postgresql-18=${TIMESCALEDB_LOADER_VERSION} \
    timescaledb-2-2.26.4-postgresql-18=${TIMESCALEDB_VERSION} \
    timescaledb-toolkit-postgresql-18=${TIMESCALEDB_TOOLKIT_VERSION}; \
  rm -rf /var/lib/apt/lists/*

CMD ["postgres", "-c", "shared_preload_libraries=timescaledb"]