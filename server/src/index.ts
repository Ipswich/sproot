import "dotenv/config";
import mainAsync, { gracefulHaltAsync } from "./program";
import { DI_KEYS } from "./utils/DependencyInjectionConstants";

mainAsync().then((app) => {
  const server = app.listen(3000, () => {
    app.set("gracefulHaltAsync", async (after: () => Promise<void>) => {
      await gracefulHaltAsync(server, app, after);
    });
    app.get(DI_KEYS.Logger).info("Sproot server listening on port 3000!");
    // Graceful shutdown on signals
    process.on("SIGINT", async () => {
      await gracefulHaltAsync(server, app);
    });
    process.on("SIGTERM", async () => {
      await gracefulHaltAsync(server, app);
    });
  });
});
