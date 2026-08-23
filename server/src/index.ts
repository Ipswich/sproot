import { configDotenv } from "dotenv";
configDotenv();
import mainAsync, { gracefulHaltAsync } from "./program";
import { DI_KEYS } from "./utils/DependencyInjectionConstants";
import { ISprootDB } from "./database/ISprootDB";

mainAsync().then((app) => {
  const server = app.listen(3000, async () => {
    app.set("gracefulHaltAsync", async (after: () => Promise<void>) => {
      await gracefulHaltAsync(server, app, after);
    });
    const logger = app.get(DI_KEYS.Logger);
    logger.info("Sproot server listening on port 3000!");

    const sprootDB = app.get(DI_KEYS.SprootDB) as ISprootDB;

    // Graceful shutdown on signals
    process.on("SIGINT", async () => {
      await gracefulHaltAsync(server, app);
    });
    process.on("SIGTERM", async () => {
      await gracefulHaltAsync(server, app);
    });

    await sprootDB.system.deleteOldDatabaseAsync(logger);
    await sprootDB.system.refreshAllAggregateTablesAsync(logger);
  });
});
