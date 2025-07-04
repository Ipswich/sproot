import fs from "fs";
import { Express } from "express";
import { Server } from "http";
import mainAsync from "../program";

let server: Server;
let app: Express;
before(async () => {
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
});

after(() => {
  server.close();
  console.log("Server closed!");
  process.nextTick(() => {
    process.exit(0);
  });
});

export { app, server };
