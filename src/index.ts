import 'dotenv/config';
import express from 'express';
import mysql2 from 'mysql2/promise';

import { GrowthDB } from './database/GrowthDB';
import { PCA9685 } from './outputs/PCA9685';
import { SensorController } from './controllers/SensorController';
import { SensorList } from './sensors/SensorList';

const app = express();

(async () => {
  const growthDB = new GrowthDB(await mysql2.createConnection({
    host: process.env['DATABASE_HOST']!,
    user: process.env['DATABASE_USER']!,
    password: process.env['DATABASE_PASSWORD']!,
    database: process.env['DATABASE_NAME']!
  }));

  const sensorList = new SensorList(growthDB);
  app.set('sensorList', sensorList);
  const pca9685 = await new PCA9685(growthDB).initializeOrRegenerateAsync();
  app.set('pca9685', pca9685);

  await sensorList.initializeOrRegenerateAsync();
  await sensorList.getReadingsAsync();
  await sensorList.addReadingsToDatabaseAsync();

  const updateStateLoop = setInterval(async () => {
    await sensorList.initializeOrRegenerateAsync();
    await sensorList.getReadingsAsync();
    await pca9685.initializeOrRegenerateAsync()
    }, parseInt(process.env['STATE_UPDATE_INTERVAL']!)
  );
  
  const updateDatabaseLoop = setInterval(async () => {
    await sensorList.addReadingsToDatabaseAsync();
    }, parseInt(process.env['DATABASE_UPDATE_INTERVAL']!)
  );

  app.get('/sensor/:sensorId', SensorController.getSensor);
  app.get('/sensors', SensorController.getAllSensorData);

  const server = app.listen(process.env['APPLICATION_PORT']!, () => {
    console.log(`sproot is listening at http://localhost:${process.env['APPLICATION_PORT']!}`)
  });

  // Graceful shutdown on signals
  process.on('SIGINT', async () => {await gracefulHalt()});
  process.on('SIGTERM', async () => {await gracefulHalt()});

  async function gracefulHalt() {
    console.log('\nShutting down...');
    server.close(async () => {
      // Stop updating database and sensors
      clearInterval(updateDatabaseLoop);
      clearInterval(updateStateLoop);
      try {
        // Cleanup sensors and turn off outputs
        await app.get('sensorList').disposeAsync();
        app.get("pca9685").dispose()
        // Close database connection
        await growthDB.disposeAsync();
      } catch (err) {
        //Dgaf, swallow anything, we're shutting down anyway.
      } finally {
        // Give everything a hot sec to finish whatever it's up to - call backs really mess with just calling process.exit.
        setTimeout(() => {
          console.log("Done! See you next time!");
          process.exit(0);
        }, 250);
      }
    })
  }
})();