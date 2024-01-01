FROM ubuntu:latest as build
RUN apt-get update -y && apt-get upgrade -y

# Install curl, nano, python, make, g++, git
RUN apt-get install curl nano python3 make g++ git -y

# Install NVM (and Node, npm)
ENV NODE_VERSION=18.18.0
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
ENV NVM_DIR=/root/.nvm
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION} --latest-npm
RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"

# Install gh
RUN apt-get install -y gpg
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | gpg --dearmor -o /usr/share/keyrings/githubcli-archive-keyring.gpg;
RUN echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null;
RUN apt-get update && apt-get install -y gh;

# Copy project
COPY .. ./sproot
RUN cd ./sproot && npm run install:client && npm run build:client

FROM nginx:alpine
COPY --from=build ./sproot/client/dist /usr/share/nginx/html
COPY --from=build ./sproot/client/default.conf /etc/nginx/conf.d/default.conf

# Expose app ports
EXPOSE 80
ENTRYPOINT ["nginx", "-g", "daemon off;"]