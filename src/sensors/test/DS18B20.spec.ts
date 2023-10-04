import ds18b20 from "ds18b20";
import { DS18B20 } from "../DS18B20";
import { ReadingType } from "../types/SensorBase";
import { MockSprootDB } from "../../database/types/ISprootDB";
import { SDBSensor } from "../../database/types/SDBSensor";

import { assert } from "chai";
import * as sinon from 'sinon';
const sandbox = sinon.createSandbox();
const mockSprootDB = new MockSprootDB();

describe('DS18B20.ts tests', function() {
  this.afterEach(() => {
    sandbox.restore();
  });

  it('should initialize a DS18B20 sensor', async () => {
    const mockDS18B20Data = { id: 1, description: 'test sensor 1', model: 'DS18B20', address: '28-00000' } as SDBSensor;

    const ds18b20Sensor = new DS18B20(mockDS18B20Data, mockSprootDB);

    assert.isTrue(ds18b20Sensor instanceof DS18B20);
    assert.equal(ds18b20Sensor.id, mockDS18B20Data.id);
    assert.equal(ds18b20Sensor.description, mockDS18B20Data.description);
    assert.equal(ds18b20Sensor.model, mockDS18B20Data.model);
    assert.equal(ds18b20Sensor.address, mockDS18B20Data.address);
    assert.equal(ds18b20Sensor.units[ReadingType.temperature], '°C');
  });

  it('should get a reading from a DS18B20 sensor', async () => {
    const mockDS18B20Data = { id: 1, description: 'test sensor 1', model: 'DS18B20', address: '28-00000' } as SDBSensor;
    const mockReading = 21.2;
    sandbox.stub(ds18b20, "temperature").yields(null, mockReading);
    
    const ds18b20Sensor = new DS18B20(mockDS18B20Data, mockSprootDB);
    await ds18b20Sensor.getReadingAsync();

    assert.equal(ds18b20Sensor.lastReading[ReadingType.temperature], String(mockReading));
  });

  it('should get all DS18B20 addresses', async () => {
    sandbox.stub(ds18b20, "sensors").yields(null, ['28-00000', '28-00001', '28-00002']);
    
    const addresses = await DS18B20.getAddressesAsync();

    assert.equal(addresses.length, 3);
    assert.equal(addresses[0], '28-00000');
    assert.equal(addresses[1], '28-00001');
    assert.equal(addresses[2], '28-00002');
  });
});