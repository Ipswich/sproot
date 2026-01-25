---
sidebar_position: 1
title: Installation
---

# Installation

Sproot is super easy to get up and running! Start with the [Docker](#run-as-docker-container) instructions, unless you want to build from [Source](#build-from-source)

## Run as docker container

To run Sproot as a docker container, go ahead and grab the `docker-compose.yaml` file from the [repo](https://github.com/Ipswich/sproot). Note that you should change some of the default values in the `docker-compose.yaml` file (we'll talk about this in [setup](/getting-started/setup)).

## Build from source

To build from source, you'll need to first pull the Github repo:

```
git pull https://github.com/Ipswich/sproot
```

There are two docker compose files in here - one for [Production](#production), and one for [Development](#development).

### Production

If you're building for production, all you need to do is run `docker compose build` from the project root. This will build the images, which can than be trivially started by running `docker compose up -d`.

### Development

If you're building for development, run `docker compose -f docker-compose.yaml.development build` from the project root. This will build images that are more suited for development.

#### Some notes on development:

- This is primarily used for developing the backend service. The thing about Sproot is that because it relies on GPIO pins, MacOS and Windows will get upset due to missing drivers. This can be solved by working through a Linux container.
- It's probably easiest to work on the client by just editing the project files locally (not in a container). You can easily view your changes by running `npm run start:dev` from the `./client` directory. It'll help to point it at a running instance, so either update `.env.development` to point an already existing instance or your dev server (probably `localhost:3000`).
