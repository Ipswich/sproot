FROM debian:latest as build
RUN apt-get update -y && apt-get upgrade -y

# Install curl
RUN apt-get install curl -y

# Install NVM (and Node, npm)
ENV NODE_VERSION=18.18.0
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
ENV NVM_DIR=/root/.nvm
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION} --latest-npm
RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"

# Copy project
COPY .. ./sproot
RUN cd ./sproot && npm run install:common
ARG VITE_MAX_CHART_ENTRIES
ARG VITE_API_SERVER_URL
ARG VITE_CLIENT_VERSION
RUN cd ./sproot && npm run install:client
RUN cd ./sproot && npm run build:client

FROM nginx:alpine
COPY --from=build ./sproot/client/dist /usr/share/nginx/html
COPY --from=build ./sproot/client/default.conf /etc/nginx/conf.d/default.conf

# Expose app ports
EXPOSE 80
ENTRYPOINT ["nginx", "-g", "daemon off;"]