import fs from "fs";
import { Express } from "express";
import { Server } from "http";
import { AddressInfo } from "net";
import { Pca9685Driver } from "pca9685";
import * as sinon from "sinon";
import mainAsync, { gracefulHaltAsync } from "../program";

let server: Server;
let app: Express;
let baseUrl: string;
before(async function () {
  this.timeout(0);
  process.env["NODE_ENV"] = "test";

  // We don't want this actually trying to do something.
  sinon.stub(Pca9685Driver.prototype, "setDutyCycle").callsFake((...args) => {
    const callback = args[3];
    if (typeof callback === "function") {
      callback(undefined);
    }
  });

  await fs.promises.mkdir("images/1/timelapse", { recursive: true });
  await fs.promises.mkdir("images/1/archive", { recursive: true });
  await fs.promises.mkdir("backups", { recursive: true });

  await fs.promises.writeFile(
    "images/1/latest.jpg",
    "This is a test image file for the latest image endpoint.",
  );

  await fs.promises.writeFile(
    "images/1/timelapse/test-1.jpg",
    "This is a test image file for the archive regeneration endpoint.",
  );
  await fs.promises.writeFile(
    "images/1/timelapse/test-2.jpg",
    "This is a test image file for the archive regeneration endpoint.",
  );

  await fs.promises.writeFile(
    "images/1/archive/timelapse.tar",
    "This is a test tar file for the timelapse archive endpoint.",
  );

  await fs.promises.writeFile("backups/test-backup.sproot", "This is a test backup file.");

  app = await mainAsync();
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
  console.log(`Listening on port ${address.port}`);
});

after(async () => {
  await gracefulHaltAsync(server, app, async () => {});
  sinon.restore();
  console.log("Server closed!");
});

export { app, server, baseUrl };
