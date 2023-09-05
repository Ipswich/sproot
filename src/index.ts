import mysql2 from 'mysql2/promise';
import 'dotenv/config';
import { GrowthDB } from './GrowthDB';
import { SensorList } from './sensors/SensorList';

main();

async function main(){
  const growthDB = new GrowthDB(await mysql2.createConnection({
    host: process.env['DATABASE_HOST']!,
    user: process.env['DATABASE_USER']!,
    password: process.env['DATABASE_PASSWORD']!,
    database: process.env['DATABASE_NAME']!
  }));

  const sensorList = new SensorList(growthDB);
  await sensorList.initialize();
  await sensorList.getReadings();
  await sensorList.addReadingsToDatabase();
  
}