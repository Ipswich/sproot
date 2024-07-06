# sproot

Garden Automation Management.

## Running for Production

There are two different configurations.

The first is unconfigured. It initializes an empty database with no sensors or outputs, with the client having no restrictions on modifying that state. Totally open ended for homebrew hardware.

The second is preconfigured. It initializes the database with no sensors and eight outputs - four relays, and four PWM controllers. This is for the default hardware that sproot has been built with in mind. In this configuration, the front end is restricted to only renaming those outputs - no adding or deleting. Sensors can still be added and modified as desired. The API will still let you go around those restrictions, but, if you're doing that you should probably consider using the unconfigured version.

1. Run `git clone https://github.com/Ipswich/sproot.git`

2. Depending on whether you want unconfigured or preconfigured:
   * Run `sudo docker compose --env-file .env.production up -d` or,
   * Run `sudo docker compose --env-file .env.preconfigured up -d`

3. Check if you get something fun at your device's IP address.


## Running for Development
### Server
Because some of the libraries required to build the project are Linux specific, it's generally recommended to work inside of a docker container.

You can easily spin up a development instance by running `sudo docker compose -f docker-compose.yml.development up -d` from the project's root. This will run the whole project, except with some extra packages preinstalled, and some tweaked development environment variables. You can then remote into (or attach your IDE to) the server's container (probably looks something like `sproot-server-1`). Once inside the container, navigate to `/sproot/server` and run `npm run start:dev` (or `npm run start` for no nodemon) to get things started.

### Client
Navigate to the `sproot/client` directory. If your api server is running on a different host, open `.env.development` and update `VITE_API_SERVER_URL` to contain your servers URL (i.e, `http://192.168.1.1`). Finally, run `npm run start:dev` to start the vite development server.