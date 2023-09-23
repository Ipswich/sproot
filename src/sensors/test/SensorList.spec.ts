import 'dotenv/config';
import bme280, { Bme280 } from 'bme280';
import { BME280 } from '../../sensors/BME280';
import { DS18B20 } from '../../sensors/DS18B20';
import { GDBSensor } from '../../database/types/GDBSensor';
import { MockGrowthDB} from '../../database/types/IGrowthDB';
import { SensorList } from '../../sensors/SensorList';

import chai, { assert, expect } from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
import * as sinon from 'sinon';

const sandbox = sinon.createSandbox(); 
const mockGrowthDB = new MockGrowthDB();

describe('SensorList.ts tests', function() {
  it('should create, update, and delete sensors, adding a DS18B20 to MockGrowthDB', async function() {
    const getSensorsAsyncStub = sandbox.stub(MockGrowthDB.prototype, 'getSensorsAsync').resolves([
      { id: 1, description: 'test sensor 1', model: 'BME280', address: '0x76' } as GDBSensor,
      { id: 2, description: 'test sensor 2', model: 'DS18B20', address: '28-00000' } as GDBSensor,
      { id: 3, description: 'test sensor 3', model: 'DS18B20', address: '28-00001' } as GDBSensor,
    ]);
    sandbox.stub(MockGrowthDB.prototype, 'getDS18B20AddressesAsync').resolves([
      {address: '28-00000'} as GDBSensor,
      {address: '28-00001'} as GDBSensor
    ]);
    sandbox.stub(DS18B20, 'getAddressesAsync').resolves(['28-00000', '28-00001', '28-00002']);
    sandbox.stub(BME280.prototype, "initAsync").resolves({} as BME280);
    const addSensorSpy = sandbox.spy(mockGrowthDB, "addSensorAsync");

    const sensorList = new SensorList(mockGrowthDB);
    await sensorList.initializeOrRegenerateAsync();

    assert.equal(addSensorSpy.callCount, 1);
    assert.equal(Object.keys(sensorList.sensors).length, 3);

    getSensorsAsyncStub.resolves([
      { id: 2, description: '2 rosnes tset', model: 'DS18B20', address: '28-00000' } as GDBSensor,
      { id: 3, description: 'test sensor 3', model: 'DS18B20', address: '28-00001' } as GDBSensor
    ]);
    await sensorList.initializeOrRegenerateAsync();
    assert.equal(Object.keys(sensorList.sensors).length, 2);
    assert.equal(sensorList.sensors['2']!.description, '2 rosnes tset');

    sandbox.restore();
  });
  it('should call dispose on DisposableSensorBase sensors', async function() {
    const mockBME280Data = { id: 1, description: 'test sensor 1', model: 'BME280', address: '0x76' } as GDBSensor;
    sandbox.stub(MockGrowthDB.prototype, 'getSensorsAsync').resolves([
      mockBME280Data,
      { id: 2, description: 'test sensor 2', model: 'DS18B20', address: '28-00000' } as GDBSensor,
    ]);
    sandbox.stub(MockGrowthDB.prototype, 'getDS18B20AddressesAsync').resolves([
      {address: '28-00000'} as GDBSensor
    ]);
    sandbox.stub(bme280, "open").resolves({close: async function (){}} as Bme280); // Don't create a real sensor - needs I2C bus
    sandbox.stub(DS18B20, 'getAddressesAsync').resolves(['28-00000']);
    sandbox.stub(BME280.prototype, "initAsync").resolves(new BME280(mockBME280Data, mockGrowthDB));
    const disposeStub = sandbox.stub(BME280.prototype, "disposeAsync");

    const sensorList = new SensorList(mockGrowthDB);
    await sensorList.initializeOrRegenerateAsync();
    await sensorList.disposeAsync();
    
    assert.equal(Object.keys(sensorList.sensors).length, 0);
    assert.equal(disposeStub.callCount, 1);

    sandbox.restore();
  });

  it('should call getReading on all sensors', async function() {
    const mockBME280Data = { id: 1, description: 'test sensor 1', model: 'BME280', address: '0x76' } as GDBSensor;
    sandbox.stub(MockGrowthDB.prototype, 'getSensorsAsync').resolves([
      mockBME280Data,
      { id: 2, description: 'test sensor 2', model: 'DS18B20', address: '28-00000' } as GDBSensor,
    ]);
    sandbox.stub(MockGrowthDB.prototype, 'getDS18B20AddressesAsync').resolves([
      {address: '28-00000'} as GDBSensor
    ]);

    sandbox.stub(DS18B20, 'getAddressesAsync').resolves(['28-00000']);
    sandbox.stub(BME280.prototype, "initAsync").resolves(new BME280(mockBME280Data, mockGrowthDB));
    const getDS18B20ReadingStub = sandbox.stub(DS18B20.prototype, "getReadingAsync");
    const getBME280ReadingStub = sandbox.stub(BME280.prototype, "getReadingAsync");

    const sensorList = new SensorList(mockGrowthDB);
    await sensorList.initializeOrRegenerateAsync();
    await sensorList.getReadingsAsync();
    
    assert.equal(Object.keys(sensorList.sensors).length, 2);
    assert.equal(getBME280ReadingStub.callCount + getDS18B20ReadingStub.callCount, 2);

    sandbox.restore();
  });

  it('should throw errors when building sensors', async function() {
    const mockBME280Data = { id: 1, description: 'test sensor 1', model: 'BME280', address: null } as GDBSensor;
    const mockDS18B20Data = { id: 2, description: 'test sensor 2', model: 'DS18B20', address: null } as GDBSensor;
    const mockSensorData = { id: 3, description: 'test sensor 3', model: 'not a recognized model', address: null } as GDBSensor;

    const getSensorsStub = sandbox.stub(MockGrowthDB.prototype, 'getSensorsAsync').resolves([ mockBME280Data ]);
    const sensorList = new SensorList(mockGrowthDB);
    
    await expect(sensorList.initializeOrRegenerateAsync()).to.eventually.be.rejectedWith('BME280 sensor address cannot be null! Sensor could not be added.');

    mockBME280Data['address'] = '0x76';
    getSensorsStub.resolves([ mockBME280Data, mockDS18B20Data ]);
    sandbox.stub(MockGrowthDB.prototype, 'getDS18B20AddressesAsync').resolves([
      {address: '28-00000'} as GDBSensor
    ]);
    await expect(sensorList.initializeOrRegenerateAsync()).to.eventually.be.rejectedWith('DS18B20 sensor address cannot be null! Sensor could not be added.');

    mockDS18B20Data['address'] = '28-00000';
    getSensorsStub.resolves([ mockBME280Data, mockDS18B20Data, mockSensorData ]);
    await expect(sensorList.initializeOrRegenerateAsync()).to.eventually.be.rejectedWith('Unrecognized sensor model: not a recognized model');

    sandbox.restore();
  })
});