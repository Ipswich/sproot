import "dotenv/config";
import mainAsync, { gracefulHaltAsync } from "./program.js";

mainAsync().then((app) => {
  const server = app.listen(3000, () => {
    app.set("gracefulHaltAsync", async () => {
      await gracefulHaltAsync(server, app);
    });
    app.get("logger").info("Sproot server listening on port 3000!");
    // Graceful shutdown on signals
    process.on("SIGINT", async () => {
      await gracefulHaltAsync(server, app);
    });
    process.on("SIGTERM", async () => {
      await gracefulHaltAsync(server, app);
    });
  });
});
