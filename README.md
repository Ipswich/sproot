# sproot
Garden Automation Management

There should probably be more detail here, but, in a nutshell:
1. Clone this repository to your desired location (linux only, built for raspberry pi).
2. Get some sort of MariaDB running, and run `./sproot-schema.sql` on it to create the database and table structure.
3. Create a user in the database. `hash` is calculated with default bcrypt.
5. `cd` into your desired location, and run `npm install` from within.
6. Configure `example.env` to hold your particular values and copy/save as `.env`
7. Run `npm run start` to kick off the compile and run.
8. Hit up your server at `${server-ip-address}:${port}/api/v1/docs`
9. Cry that there is only a small API.
