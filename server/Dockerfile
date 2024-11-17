FROM debian:12.6-slim AS build

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
# Install python3, make, g++
RUN apt-get install python3 make g++ -y
RUN npm run install:server
RUN npm run build:server
# Clean up build dependencies, install only production dependencies
RUN rm -rf /sproot/node_modules
RUN npm run install:server:production

FROM node:22.5.1-bookworm-slim
# Copy production dependencies and common/server
COPY --from=build /sproot/node_modules /sproot/node_modules
COPY --from=build /sproot/common/dist /sproot/common/dist
COPY --from=build /sproot/server/dist /sproot/server/dist
# Need this one too for serving the API spec  
COPY --from=build /sproot/api_spec /sproot/api_spec

# Set this as the project root - api_spec lives a layer below and the server expects to be run from here.
WORKDIR /sproot/server

# Expose app ports
EXPOSE 3000
ENTRYPOINT ["node", "./dist/index.js"]