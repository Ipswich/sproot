# sproot

sproot is a Raspberry Pi-based greenhouse controller and monitoring system with an eye towards extensibility and ease of maintenance. By utilizing 3D printed parts, easy to acquire electronics, and flexible software, sproot aims to be a comprehensive approach to hands-off environmental regulation.
<div>
<img width="24%" alt="Sproot Sensor Data" src="https://github.com/user-attachments/assets/cfcabea1-d3f1-4c3e-8f6c-60efe2253d15">
<img width="24%" alt="Sproot Output States" src="https://github.com/user-attachments/assets/d1644bdf-5cb3-4d67-860c-a31eff10b263">
<img width="24%" alt="Sproot Automations" src="https://github.com/user-attachments/assets/65346d8b-369a-4e5e-bdfc-b3f72ad1faaa">
<img width="24%" alt="Screenshot 2024-10-07 at 12-29-57 Sproot" src="https://github.com/user-attachments/assets/d201f88c-0763-4337-b846-a01e5a2bfd29">
</div>


## Running for Production 
Grab the `docker-compose.yaml` file (or clone the repo), and run `sudo docker compose up -d`. Images exist for `linux/amd64` and `linux/arm64`.

### Building locally
If you'd rather build the project yourself, clone the repo and comment/uncomment the relevant lines in the `docker-compose.yaml` file.

Additionally, you'll find that there's a `.env.preconfigured` file. This file is useful for soft-locking sproot to the outputs it was designed around - 4 relays, 4 PWM controllers. When the images are built with this env file, the front end will no longer display the buttons to add or remove outputs. Please note that this won't prevent the API from making such changes.

## Running for Development
### Server
Because some of the libraries required to build the project are Linux specific, it's generally recommended to work inside of a docker container.

You can easily spin up a development instance by running `sudo docker compose -f docker-compose.yml.development up -d` from the project's root. This will build and run the whole project, except with some extra packages preinstalled, and some tweaked development environment variables. You can then remote into (or attach your IDE to) the server's container (probably looks something like `sproot-server-1`). Once inside the container, navigate to `/sproot/server` and run `npm run start:dev` (or `npm run start` for no nodemon) to get things started.

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
* (1) USB Power Pigtail - Raspberry Pis 3B+ and older (and Raspberry Pi Zeros) use [Micro USB](https://www.amazon.com/dp/B09DKYPCXK); Raspberry Pis 4 and newer use [USB-C](https://www.amazon.com/dp/B0CMQ42P9Q).
* (8) [M2.5 x 10mm screws and nuts](https://www.amazon.com/dp/B09WJ4WF9K)
* (16) [M3 x 10mm screws and nuts](https://www.amazon.com/dp/B08YYZSZVP)
* (4x M2F, 11x F2F) [Jumper Wires](https://www.amazon.com/dp/B01EV70C78)
* (some) [PCB Wire](https://www.amazon.com/dp/B07TX6BX47) - Possibly optional, but highly recommended.

#### Sensors
* [BME280](https://www.amazon.com/dp/B07KR24P6P)
* [DS18B20](https://www.amazon.com/dp/B08W27W7LJ)
