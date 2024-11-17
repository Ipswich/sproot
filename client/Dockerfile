FROM --platform=$BUILDPLATFORM debian:12.6-slim AS build

RUN echo "Acquire::http::Pipeline-Depth 0;" > /etc/apt/apt.conf.d/99custom && \
    echo "Acquire::http::No-Cache true;" >> /etc/apt/apt.conf.d/99custom && \
    echo "Acquire::BrokenProxy    true;" >> /etc/apt/apt.conf.d/99custom

RUN apt-get update -y && apt-get upgrade -y

# Install curl
RUN apt-get install curl -y

# Install NVM (and Node, npm)
ENV NODE_VERSION=22.5.1
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
ENV NVM_DIR=/root/.nvm
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION} --latest-npm
RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"

# Copy project
COPY .. ./sproot
WORKDIR /sproot
RUN npm run install:common
ENV NODE_OPTIONS="--max-old-space-size=8192"
ARG VITE_API_SERVER_URL
ARG VITE_PRECONFIGURED
RUN npm run install:client
RUN npm run build:client

FROM nginx:1.26.2-alpine-slim
COPY --from=build ./sproot/client/dist /usr/share/nginx/html
COPY --from=build ./sproot/client/default.conf /etc/nginx/conf.d/default.conf

# Expose app ports
EXPOSE 80
ENTRYPOINT ["nginx", "-g", "daemon off;"]