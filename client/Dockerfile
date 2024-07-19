FROM debian:latest AS build

RUN echo "Acquire::http::Pipeline-Depth 0;" > /etc/apt/apt.conf.d/99custom && \
    echo "Acquire::http::No-Cache true;" >> /etc/apt/apt.conf.d/99custom && \
    echo "Acquire::BrokenProxy    true;" >> /etc/apt/apt.conf.d/99custom

RUN apt-get update -y && apt-get upgrade -y

# Install curl
RUN apt-get install curl -y

# Install NVM (and Node, npm)
ENV NODE_VERSION=22.4.1
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
ARG VITE_CHART_DATA_POINT_INTERVAL
ARG VITE_MAX_CHART_DATA_POINTS
ARG VITE_API_SERVER_URL
ARG VITE_CLIENT_VERSION
RUN npm run install:client && npm run build:client

FROM nginx:alpine
COPY --from=build ./sproot/client/dist /usr/share/nginx/html
COPY --from=build ./sproot/client/default.conf /etc/nginx/conf.d/default.conf

# Expose app ports
EXPOSE 80
ENTRYPOINT ["nginx", "-g", "daemon off;"]