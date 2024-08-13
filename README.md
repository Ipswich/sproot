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

## Parts
Foremost, I'd like to note that my implementation is soldered. This can still be implemented on a breadboard if that's more your speed, though it'll change what parts you truly need and make it "difficult" to attach it to the 3D printed mount.

The parts used in my implementation of Sproot are fairly common and easily acquired. I've ordered everything off of Amazon, but you could likely just as easily source things from Digikey, Mouser, or any other electronics supply store. Any links to parts are intended to be used as reference; however, for the most part, these are the parts I used (I tend to order plenty of replacements).

Lastly, this section is scoped for the `preconfigured` option, though you should be able to extrapolate from the [circuitry](/schematics//Sproot%20Circuit.pdf) fairly easily if you want to expand on what's here.

#### Raspberry Pi
You need one. I've been using a Raspberry Pi 3B+, but there's no reason this couldn't be implemented on something more modern, or maybe even less modern (must be 64-bit though).

#### Circuitry and Hardware
* (1) [PCA9685 Board](https://www.amazon.com/dp/B08C9R9MZ2) - This is **NOT** the same as the bare  integrated circuit. I'm not an electrical engineer, so it's easier for me to get a part that has the necessary circuitry rather than constructing it myself. I've been using generic ones from Amazon. Ultimately, they all seem to be more or less modeled after the one designed by `Adafruit`.
* (4) [5v Relays](https://www.amazon.com/dp/B07WQH63FB) - This is **NOT** the same as the bare relay. There are loads of these on Amazon, and, if you want, you can get them as multi-channel boards. I've opted for single channel boards as I've historically had issues with a single relay dying on a board. Rather than having a 3-of-4 channel board, single channel boards are modular, and can be replaced easily.
* (4) [PC817 Opto-isolators](https://www.amazon.com/dp/B0CBKK6T3D)
* (1) [4.7k Ohm Resistor](https://www.amazon.com/dp/B07QJB3LGN)
* (1) [5x7cm Soldering Prototype Board](https://www.amazon.com/dp/B08WJCVJ1J)
* (4x 2 pin, 1x 3 pin, 1x 4pin) [Terminal Blocks](https://www.amazon.com/dp/B088LVP6ML)
* (10) [Female Header Pins](https://www.amazon.com/dp/B09MY5MJ36)
* (7) [Male Header Pins](https://www.amazon.com/dp/B06ZZN8L9S)
* (16) [Female Socket Type Header Pins](https://www.amazon.com/dp/B012ACSO4Y) - Optional, but enable you to swap out PC817 opto-isolators if one should fail.
* (1) [5v 4A Power Supply](https://www.amazon.com/dp/B087LY41PV)
* (1) [Female Barrel Jack Pigtail](https://www.amazon.com/dp/B07CWQPPTW) - Make sure to match the diameter and depth of the power supply plug.
* (1) USB Pigtail - Raspberry Pis 3B+ and older (and Raspberry Pi Zeros) use [Micro USB](https://www.amazon.com/dp/B09DKYPCXK); Raspberry Pis 4 and newer use [USB-C](https://www.amazon.com/dp/B0CMQ42P9Q).
* (8) [M2.5 x 10mm screws and nuts](https://www.amazon.com/dp/B09WJ4WF9K)
* (16) [M3 x 10mm screws and nuts](https://www.amazon.com/dp/B08YYZSZVP)
* (4x M2F, 11x F2F) [Jumper Wires](https://www.amazon.com/dp/B01EV70C78)
* (some) [PCB Wire](https://www.amazon.com/dp/B07TX6BX47) - Possibly optional, but highly recommended.

#### Sensors
* [BME280](https://www.amazon.com/dp/B07KR24P6P)
* [DS18B20](https://www.amazon.com/dp/B08W27W7LJ)