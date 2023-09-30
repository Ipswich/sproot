import 'dotenv/config';
import { PCA9685, PCA9685State } from '../PCA9685';
import { Pca9685Driver } from 'pca9685';
import { SDBOutput } from '../../database/types/SDBOutput';
import { MockSprootDB } from '../../database/types/ISprootDB';

import chai, { assert, expect } from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
import * as sinon from 'sinon';
import { ControlMode } from '../types/OutputBase';
const sandbox = sinon.createSandbox(); 
const mockSprootDB = new MockSprootDB();

describe('PCA9685.ts tests', function() {
  it('should create and update and delete PCA9685 outputs', async function() {
    sandbox.createStubInstance(Pca9685Driver);
    const getOutputsAsyncStub = sandbox.stub(MockSprootDB.prototype, 'getOutputsAsync').resolves([
      { id: 1, description: 'test output 1', pin: 0, isPwm: true, isInvertedPwm: false } as SDBOutput,
      { id: 2, description: 'test output 2', pin: 1, isPwm: false, isInvertedPwm: false } as SDBOutput,
      { id: 3, description: 'test output 3', pin: 2, isPwm: true, isInvertedPwm: true} as SDBOutput,
      { id: 4, description: 'test output 4', pin: 3, isPwm: false, isInvertedPwm: true } as SDBOutput,
    ]);

    const pca9685 = new PCA9685(mockSprootDB);
    await pca9685.initializeOrRegenerateAsync();
    assert.equal(Object.keys(pca9685.outputs).length, 4);
    
    getOutputsAsyncStub.resolves([{ id: 1, description: '1 tuptuo tset', pin: 0, isPwm: true, isInvertedPwm: false } as SDBOutput]);
    await pca9685.initializeOrRegenerateAsync();
    assert.equal(Object.keys(pca9685.outputs).length, 1);
    assert.equal(pca9685.outputs["1"]!.description, "1 tuptuo tset");
    
    sandbox.restore();
  });

  it('should return output data (no functions)', async function() {
    sandbox.createStubInstance(Pca9685Driver);
    sandbox.stub(MockSprootDB.prototype, 'getOutputsAsync').resolves([
      { id: 1, description: 'test output 1', pin: 0, isPwm: true, isInvertedPwm: false } as SDBOutput,
    ]);

    const pca9685 = new PCA9685(mockSprootDB);
    await pca9685.initializeOrRegenerateAsync();
    const outputData = pca9685.outputData;
    
    assert.equal(outputData['1']!['description'], 'test output 1');
    assert.equal(outputData['1']!['pin'], 0);
    assert.equal(outputData['1']!['isPwm'], true);
    assert.equal(outputData['1']!['isInvertedPwm'], false);
    assert.exists(pca9685.outputs['1']!['pca9685']);
    assert.exists(pca9685.outputs['1']!['sprootDB']);
    sandbox.restore();
  });

  it('should update and apply states with respect to control mode', async function() {
    const getOutputsAsyncStub = sandbox.stub(MockSprootDB.prototype, 'getOutputsAsync').resolves([
      { id: 1, description: 'test output 1', pin: 0, isPwm: true, isInvertedPwm: false } as SDBOutput,
    ]);
    sandbox.createStubInstance(Pca9685Driver);
    const setDutyCycleStub = sandbox.stub(Pca9685Driver.prototype, 'setDutyCycle').returns();
    const pca9685 = new PCA9685(mockSprootDB);
    await pca9685.initializeOrRegenerateAsync();

    //Schedule High
    pca9685.setNewOutputState('1', <PCA9685State>{ isOn: true, value: 100 }, ControlMode.schedule);
    assert.equal(pca9685.outputs['1']?.scheduleState.value, 100);
    pca9685.executeOutputState();
    assert.equal(setDutyCycleStub.callCount, 1);
    assert.equal(setDutyCycleStub.getCall(0).args[0], 0);
    assert.equal(setDutyCycleStub.getCall(0).args[1], 1);

    //Schedule Low
    pca9685.setNewOutputState('1', <PCA9685State>{ isOn: false, value: 0 }, ControlMode.schedule);
    assert.equal(pca9685.outputs['1']?.scheduleState.value, 0);
    pca9685.executeOutputState();
    assert.equal(setDutyCycleStub.callCount, 2);
    assert.equal(setDutyCycleStub.getCall(1).args[0], 0);
    assert.equal(setDutyCycleStub.getCall(1).args[1], 0);

    //Swap to Manual
    pca9685.updateControlMode('1', ControlMode.manual);

    //Manual Low
    pca9685.setNewOutputState('1', <PCA9685State>{ isOn: false, value: 0 }, ControlMode.manual);
    assert.equal(pca9685.outputs['1']?.manualState.value, 0);
    pca9685.executeOutputState();
    assert.equal(setDutyCycleStub.callCount, 3);
    assert.equal(setDutyCycleStub.getCall(2).args[0], 0);
    assert.equal(setDutyCycleStub.getCall(2).args[1], 0);

    //Manual High
    pca9685.setNewOutputState('1', <PCA9685State>{ isOn: true, value: 100 }, ControlMode.manual);
    assert.equal(pca9685.outputs['1']?.manualState.value, 100);
    pca9685.executeOutputState();
    assert.equal(setDutyCycleStub.callCount, 4);
    assert.equal(setDutyCycleStub.getCall(3).args[0], 0);
    assert.equal(setDutyCycleStub.getCall(3).args[1], 1);

    //Swap to Schedule
    pca9685.updateControlMode('1', ControlMode.schedule);

    //Execute Schedule Low
    pca9685.executeOutputState();
    assert.equal(setDutyCycleStub.callCount, 5);
    assert.equal(setDutyCycleStub.getCall(4).args[0], 0);
    assert.equal(setDutyCycleStub.getCall(4).args[1], 0);

    //Inverted PWM Execution
    getOutputsAsyncStub.resolves([{ id: 1, description: 'test output 1', pin: 0, isPwm: true, isInvertedPwm: true } as SDBOutput]);
    await pca9685.initializeOrRegenerateAsync();

    pca9685.setNewOutputState('1', <PCA9685State>{ isOn: true, value: 100 }, ControlMode.schedule);
    assert.equal(pca9685.outputs['1']?.scheduleState.value, 100);
    pca9685.executeOutputState('1'); //Receives individual output id as well.
    assert.equal(setDutyCycleStub.callCount, 6);
    assert.equal(setDutyCycleStub.getCall(5).args[0], 0);
    assert.equal(setDutyCycleStub.getCall(5).args[1], 0);

    sandbox.restore();
  });

  it('should throw errors for invalid values', async function() {
    sandbox.createStubInstance(Pca9685Driver);
    sandbox.stub(Pca9685Driver.prototype, 'setDutyCycle').returns();
    const getOutputsAsyncStub = sandbox.stub(MockSprootDB.prototype, 'getOutputsAsync').resolves([
      { id: 1, description: 'test output 1', pin: 0, isPwm: false, isInvertedPwm: false } as SDBOutput,
    ]);
    const pca9685 = new PCA9685(mockSprootDB);
    await pca9685.initializeOrRegenerateAsync();
    pca9685.setNewOutputState('1', <PCA9685State>{ isOn: true, value: 50 }, ControlMode.schedule);
    assert.throws(() => pca9685.executeOutputState(), 'Output is not a PWM output');

    getOutputsAsyncStub.resolves([
      { id: 1, description: 'test output 1', pin: 0, isPwm: true, isInvertedPwm: false } as SDBOutput,
    ]);
    await pca9685.initializeOrRegenerateAsync();
    pca9685.setNewOutputState('1', <PCA9685State>{ isOn: true, value: 101 }, ControlMode.schedule);
    assert.throws(() => pca9685.executeOutputState(), 'PWM value must be between 0 and 100');

    getOutputsAsyncStub.resolves([
      { id: 1, description: 'test output 1', pin: 0, isPwm: true, isInvertedPwm: false } as SDBOutput,
      { id: 2, description: 'test output 1', pin: 0, isPwm: true, isInvertedPwm: false } as SDBOutput,
    ]);

    await expect(pca9685.initializeOrRegenerateAsync()).to.eventually.be.rejectedWith('Pin 0 is already in use or is invalid');
    sandbox.restore();
  });
});
