import "dotenv/config";
import mainAsync from "./program";

mainAsync().then((app) => {
  const server = app.listen(3000, () => {
    app.set("gracefulHaltAsync", gracefulHaltAsync);
    app.get("logger").info("Sproot server listening on port 3000!");
    // Graceful shutdown on signals
    process.on("SIGINT", async () => {
      await gracefulHaltAsync();
    });
    process.on("SIGTERM", async () => {
      await gracefulHaltAsync();
    });

    async function gracefulHaltAsync() {
      const logger = app.get("logger");
      logger.info("Shutting down...");
      server.closeAllConnections();
      server.close(async () => {
        // Stop updating database and sensors
        await app.get("updateDatabaseCronJob").stop();
        await app.get("automationsCronJuob").stop();
        await app.get("updateDevicesCronJob").stop();
        try {
          // Cleanup Cameras
          await app.get("cameraManager")[Symbol.asyncDispose]();

          // Cleanup sensors and turn off outputs
          await app.get("sensorList")[Symbol.asyncDispose]();
          app.get("outputList")[Symbol.dispose]();

          // Cleanup system status monitor
          app.get("systemStatusMonitor")[Symbol.dispose]();

          // Close database connection
          await app.get("sprootDB")[Symbol.asyncDispose]();
        } catch (err) {
          //Dgaf, swallow anything, we're shutting down anyway.
          logger.error(err);
        } finally {
          // Give everything a hot sec to finish whatever it's up to - call backs really mess with just calling process.exit.
          setTimeout(() => {
            logger.info("Done! See you next time!");
            process.exit(0);
          }, 250);
        }
      });
    }
  });
});
