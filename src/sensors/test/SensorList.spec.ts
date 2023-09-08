import 'dotenv/config';
import { BME280 } from '../../sensors/BME280';
import { DS18B20 } from '../../sensors/DS18B20';
import { GDBSensor } from '../../types/database-objects/GDBSensor';
import { MockGrowthDB } from './MockGrowthDB';
import { SensorList } from '../../sensors/SensorList';

import { assert } from "chai";
import * as sinon from 'sinon';
const sandbox = sinon.createSandbox(); 
const mockGrowthDB = new MockGrowthDB();

describe('SensorList.ts tests', function() {
  it('should add 3 sensors, and add a DS18B20 sensor to MockGrowthDB', async function() {
    sandbox.stub(MockGrowthDB.prototype, 'getSensors').resolves([
      { id: 1, description: 'test sensor 1', model: 'BME280', address: '0x76' } as GDBSensor,
      { id: 2, description: 'test sensor 2', model: 'DS18B20', address: '28-00000' } as GDBSensor,
      { id: 3, description: 'test sensor 3', model: 'DS18B20', address: '28-00001' } as GDBSensor,
    ]);
    sandbox.stub(MockGrowthDB.prototype, 'getDS18B20Addresses').resolves([
      {address: '28-00000'} as GDBSensor,
      {address: '28-00001'} as GDBSensor
    ]);
    sandbox.stub(DS18B20, 'getAddressesAsync').resolves(['28-00000', '28-00001', '28-00002']);
    sandbox.stub(BME280.prototype, "initAsync").resolves({} as BME280);
    const addSensorSpy = sandbox.spy(mockGrowthDB, "addSensor");

    const sensorList = new SensorList(mockGrowthDB);
    await sensorList.initializeOrRegenerate();

    assert.equal(addSensorSpy.callCount, 1);
    assert.equal(Object.keys(sensorList.sensors).length, 3);
  })
});