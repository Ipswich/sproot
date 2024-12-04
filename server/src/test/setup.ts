import { Express } from "express";
import { Server } from "http";
import mainAsync from "../program";

let server: Server;
let app: Express;
before(async () => {
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
