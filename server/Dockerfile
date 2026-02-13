FROM debian:12.13-slim AS build

RUN echo "Acquire::http::Pipeline-Depth 0;" > /etc/apt/apt.conf.d/99custom && \
  echo "Acquire::http::No-Cache true;" >> /etc/apt/apt.conf.d/99custom && \
  echo "Acquire::BrokenProxy true;" >> /etc/apt/apt.conf.d/99custom

RUN apt-get update -y && apt-get upgrade -y

# Install curl
RUN apt-get install curl -y

# Install NVM (and Node, npm)
ENV NODE_VERSION=24.13.1
ENV NVM_VERSION=v0.40.4
ENV NVM_DIR=/root/.nvm
RUN curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh | bash \
  && bash -lc "source $NVM_DIR/nvm.sh && nvm install ${NODE_VERSION} --latest-npm && nvm alias default v${NODE_VERSION}"
ENV PATH="$NVM_DIR/versions/node/v${NODE_VERSION}/bin/:${PATH}"

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

FROM node:24.13.1-bookworm-slim

# Copy node production dependencies
COPY --from=build /sproot/node_modules /sproot/node_modules
# Copy over common/server
COPY --from=build /sproot/common/dist /sproot/common/dist
COPY --from=build /sproot/server/dist /sproot/server/dist
COPY --from=build /sproot/server/python /sproot/server/python
COPY --from=build /sproot/server/static /sproot/server/static
COPY --from=build /sproot/api_spec /sproot/api_spec

# Install mysql and camera dependencies
ENV PYTHONDONTWRITEBYTECODE=1
RUN echo "Acquire::http::Pipeline-Depth 0;" > /etc/apt/apt.conf.d/99custom && \
  echo "Acquire::http::No-Cache true;" >> /etc/apt/apt.conf.d/99custom && \
  echo "Acquire::BrokenProxy true;" >> /etc/apt/apt.conf.d/99custom

RUN apt-get update && apt-get install -y --no-install-recommends gnupg \
  && echo "deb http://archive.raspberrypi.org/debian/ bookworm main" > /etc/apt/sources.list.d/raspi.list \
  && apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 82B129927FA3303E
RUN apt-get update && apt-get -y upgrade \
  && apt-get install -y --no-install-recommends default-mysql-client udev python3-pip python3-picamera2\
  && apt-get clean \
  && apt-get autoremove \
  && rm -rf /var/cache/apt/archives/* \
  && rm -rf /var/lib/apt/lists/*
RUN pip3 install fastapi uvicorn --break-system-packages

# Set this as the project root - api_spec lives a layer below and the server expects to be run from here.
WORKDIR /sproot/server

# Expose app ports
EXPOSE 3000
ENTRYPOINT ["node", "./dist/index.js"]