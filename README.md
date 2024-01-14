# sproot

Garden Automation Management.

## Running for Production

1. Run `git clone https://github.com/Ipswich/sproot.git && docker compose up -d`. Might require sudo because it needs access for parts for sensors.
2. Check if you get something fun at your device's IP address.


## Running for Development
### Server
Because some of the libraries required to build the project are Linux specific, I'd recommend developing inside of a docker container. 

You can easily spin up a development instance by running `sudo docker compose -f docker-compose.yml.development up -d` from the project's root. This will run the whole project, except with development environment variables - more logging and whatnot. You can then remote into or attach your IDE to the server's container (probably something like `sproot-server-1`). Once inside the container, navigate to `/sproot/server` and run `npm run start:dev` (or `npm run start` for no nodemon) to get things started.

Please be aware that if your docker container goes down, you will lose your unpushed changes. Be mindful of your battery life!

### Client
Navigate to the `sproot/client` directory. If your api server is running on a different host, open `.env.development` and update `VITE_API_SERVER_URL` to hold your servers URL (i.e, `http://192.168.1.1`). Finally, run `npm run start:dev` to start the vite development server.