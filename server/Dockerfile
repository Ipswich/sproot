FROM ubuntu:latest
RUN apt update -y && apt upgrade -y

# Install curl, nano, python, make, g++, git
RUN apt install curl nano python3 make g++ git -y

# Install NVM (and Node, npm)
ENV NODE_VERSION=18.18.0
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash
ENV NVM_DIR=/root/.nvm
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION} --latest-npm
RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"

# Install gh
RUN apt install -y gpg
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | gpg --dearmor -o /usr/share/keyrings/githubcli-archive-keyring.gpg;
RUN echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null;
RUN apt update && apt install -y gh;

# Copy project
COPY .. ./sproot
RUN cd ./sproot && npm run install:server 
ENTRYPOINT cd ./sproot && npm run start:server

# Expose app ports
EXPOSE 3000
