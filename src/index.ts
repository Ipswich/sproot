import 'dotenv/config';
import cookieParser from 'cookie-parser';
import express from 'express';
import mysql2 from 'mysql2/promise';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

import { SprootDB } from './database/SprootDB';
import { SensorList } from './sensors/SensorList';
import { OutputList } from './outputs/OutputList';

import login, {authenticate} from './api/v1/middleware/Authentication';
import sensorRouter from './api/v1/SensorRouter';
import outputRouter from './api/v1/OutputRouter';

const mysqlConfig = {
  host: process.env['DATABASE_HOST']!,
  user: process.env['DATABASE_USER']!,
  password: process.env['DATABASE_PASSWORD']!,
  database: process.env['DATABASE_NAME']!,
  port: parseInt(process.env['DATABASE_PORT']!)
};

const swaggerOptions = YAML.load('./openapi.yml');
swaggerOptions.defaultModelsExpandDepth = -1;
const app = express();

(async () => {
  const sprootDB = new SprootDB(await mysql2.createConnection(mysqlConfig));
  app.set('sprootDB', sprootDB);

  const sensorList = new SensorList(sprootDB);
  app.set('sensorList', sensorList);
  const outputList = new OutputList(sprootDB);
  app.set('outputList', outputList);

  await sensorList.initializeOrRegenerateAsync();
  await sensorList.getReadingsAsync();
  await outputList.initializeOrRegenerateAsync();
  await sensorList.addReadingsToDatabaseAsync();

  //State update loop
  const updateStateLoop = setInterval(async () => {
    await sensorList.initializeOrRegenerateAsync();
    await sensorList.getReadingsAsync();
    await outputList.initializeOrRegenerateAsync();
    //Add triggers and shit here.

    //Execute any changes made to state.
    outputList.executeOutputState();
    }, parseInt(process.env['STATE_UPDATE_INTERVAL']!)
  );
  
  // Database update loop
  const updateDatabaseLoop = setInterval(async () => {
    await sensorList.addReadingsToDatabaseAsync();
    }, parseInt(process.env['DATABASE_UPDATE_INTERVAL']!)
  );

  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({
    extended: true
  }));

  app.use('/api/v1/authenticate', login);
  app.use('/api/v1/sensors', authenticate, sensorRouter)
  app.use('/api/v1/outputs', authenticate, outputRouter)
  
  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerOptions, {swaggerOptions : { defaultModelsExpandDepth: -1 }}));
  
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
        await sprootDB.disposeAsync();
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