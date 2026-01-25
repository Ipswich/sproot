---
sidebar_position: 2
title: Setup
---

# Setup

## Configuration

Once you've grabbed the docker compose file, you should update some of the values in it. There are some comments at the top of the file saying as much. Take a look at these variables at the top, and update the strings at the end to something different.

- `x-database-password: &db_password "root"`
- `x-jwt-secret: &jwt_secret "CHANGE ME"`
- `x-interservice-authentication-key: &interservice_authentication_key "CHANGE ME"`
- `x-default-user-name: &default_user_name "dev-test"`
- `x-default-user-email: &default_user_email "dev-test@example.com"`
- `x-default-user-password: &default_user_password "password"`

## Running

### Production

Run `docker compose up -d` in the same directory as the `docker-compose.yaml` file. This'll pull images and run Sproot in the background.

### Development

Run `docker compose -f docker-compose.yaml.development up -d` from the root of the project. You'll need to manually start the backend server by connecting to the running container. This can be done by executing `docker exec -it sproot-server-1 /bin/bash` to connect, and then navigating to `/sproot/server` and running `npm run start`. This should start the backend service on `localhost:3000`.

Conversely, it's probably easiest to modify the client by just editing the project files locally (not in a container). You can easily view your changes by running `npm run start:dev` from the `./client` directory. It'll help to point it at a running instance, so either update `.env.development` to point an already existing instance or your dev server (probably `localhost:3000`).
