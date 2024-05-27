FROM debian:latest
RUN apt-get update -y && apt-get upgrade -y

# Install curl
RUN apt-get install curl -y

# Install NVM (and Node, npm)
ENV NODE_VERSION=21.7.0
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
ENV NVM_DIR=/root/.nvm
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION} --latest-npm
RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"

# Copy project
COPY .. ./sproot
RUN cd ./sproot && npm run install:common
# Install python3, make, g++
RUN apt-get install python3 make g++ -y
RUN cd ./sproot && npm run install:server 
ENTRYPOINT cd ./sproot && npm run start:server

# Expose app ports
EXPOSE 3000
