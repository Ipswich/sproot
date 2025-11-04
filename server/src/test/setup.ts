import fs from "fs";
import { Express } from "express";
import { Server } from "http";
import mainAsync, { gracefulHaltAsync } from "../program";

let server: Server;
let app: Express;
before(async function () {
  // increase hook timeout so long setup won't cause Mocha to bail out (use 20s here)
  this.timeout(20000);

  await fs.promises.mkdir("images/timelapse", { recursive: true });
  await fs.promises.mkdir("images/archive", { recursive: true });

  await fs.promises.writeFile(
    "images/latest.jpg",
    "This is a test image file for the latest image endpoint.",
  );

  await fs.promises.writeFile(
    "images/timelapse/test-1.jpg",
    "This is a test image file for the archive regeneration endpoint.",
  );
  await fs.promises.writeFile(
    "images/timelapse/test-2.jpg",
    "This is a test image file for the archive regeneration endpoint.",
  );

  await fs.promises.writeFile(
    "images/archive/timelapse.tar",
    "This is a test tar file for the timelapse archive endpoint.",
  );

  app = await mainAsync();
  server = app.listen(3000);
  console.log("Listening on port 3000");
  this.timeout(2000);
});

after(async () => {
  await gracefulHaltAsync(server, app);
  console.log("Server closed!");
});

export { app, server };
