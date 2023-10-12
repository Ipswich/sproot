# sproot

Garden Automation Management

There should probably be more detail here, but, in a nutshell:

1. Clone this repository to your desired location (linux only, built for raspberry pi).
2. Run `docker compose up -d`
3. Remote into `sproot-app-1` by running `docker exec -it sproot-app-1 /bin/bash`
4. From inside the container, `cd sproot` and run `npm run start`. You should be greeted with a "server now listening message, of sorts.
