FROM --platform=$BUILDPLATFORM debian:12.13-slim AS build

RUN echo "Acquire::http::Pipeline-Depth 0;" > /etc/apt/apt.conf.d/99custom && \
    echo "Acquire::http::No-Cache true;" >> /etc/apt/apt.conf.d/99custom && \
    echo "Acquire::BrokenProxy    true;" >> /etc/apt/apt.conf.d/99custom

RUN apt-get update -y && apt-get upgrade -y

# Install curl
RUN apt-get install curl -y

# Install NVM (and Node, npm)
ENV NODE_VERSION=24.13.0
ENV NVM_VERSION=v0.40.4
ENV NVM_DIR=/root/.nvm
RUN curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh | bash \
  && bash -lc "source $NVM_DIR/nvm.sh && nvm install ${NODE_VERSION} --latest-npm && nvm alias default v${NODE_VERSION}"
ENV PATH="$NVM_DIR/versions/node/v${NODE_VERSION}/bin/:${PATH}"

# Copy project
COPY .. ./sproot
WORKDIR /sproot
RUN npm run install:common
ENV NODE_OPTIONS="--max-old-space-size=8192"
ARG VITE_VERSION
ARG VITE_API_SERVER_URL
# Build client
RUN npm run install:client
RUN npm run build:client

# Build Docs
RUN npm run install:docs
RUN npm run build:docs

FROM nginx:1.29.5-alpine-slim
COPY --from=build ./sproot/client/dist /usr/share/nginx/html
COPY --from=build ./sproot/docs/build /usr/share/nginx/html/docs
COPY --from=build ./sproot/gateway/config/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build ./sproot/gateway/config/nginx.conf /etc/nginx/nginx.conf

# Expose app ports
EXPOSE 80
ENTRYPOINT ["nginx", "-g", "daemon off;"]