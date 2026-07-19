ARG BASE_IMAGE=timescale/timescaledb:2.26.4-pg18

FROM ${BASE_IMAGE} AS toolkit-builder

ARG TOOLKIT_VERSION=1.22.0
ARG CARGO_PGRX_VERSION=0.16.1

USER root

RUN apk add --no-cache \
  bash \
  build-base \
  cargo \
  clang \
  clang19-libclang \
  curl \
  git \
  llvm19-dev \
  openssl-dev \
  pkgconf \
  postgresql18-dev \
  rust \
  rustfmt

ENV CARGO_HOME=/root/.cargo
ENV LIBCLANG_PATH=/usr/lib
ENV PATH=/root/.cargo/bin:${PATH}
ENV PGRX_HOME=/tmp/pgrx

WORKDIR /tmp
RUN git clone --depth 1 --branch ${TOOLKIT_VERSION} https://github.com/timescale/timescaledb-toolkit.git

WORKDIR /tmp/timescaledb-toolkit/extension
RUN cargo install --version =${CARGO_PGRX_VERSION} --force cargo-pgrx \
  && cargo pgrx init --pg18 /usr/local/bin/pg_config \
  && cargo pgrx install --release --features pg18 \
  && cargo run --manifest-path ../tools/post-install/Cargo.toml -- /usr/local/bin/pg_config

RUN install -d /toolkit-artifacts/lib /toolkit-artifacts/share/extension \
  && cp /usr/local/lib/postgresql/timescaledb_toolkit-* /toolkit-artifacts/lib/ \
  && cp /usr/local/share/postgresql/extension/timescaledb_toolkit* /toolkit-artifacts/share/extension/

FROM ${BASE_IMAGE}

COPY --from=toolkit-builder /toolkit-artifacts/lib/ /usr/local/lib/postgresql/
COPY --from=toolkit-builder /toolkit-artifacts/share/extension/ /usr/local/share/postgresql/extension/