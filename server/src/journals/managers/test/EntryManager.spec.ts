import { assert } from "chai";
import sinon from "sinon";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SDBJournalEntry } from "@sproot/sproot-common/dist/database/SDBJournalEntry";
import { SDBJournalEntryTag } from "@sproot/sproot-common/dist/database/SDBJournalEntryTag";
import { SDBJournalEntryDeviceData } from "@sproot/sproot-common/dist/database/SDBJournalEntryDeviceData";
import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import { SDBReading } from "@sproot/sproot-common/dist/database/SDBReading";
import { SDBOutputState } from "@sproot/sproot-common/dist/database/SDBOutputState";
import { SDBJournalEntryTagLookup } from "@sproot/sproot-common/dist/database/SDBJournalEntryTagLookup";
import { SDBOutput } from "@sproot/sproot-common/dist/database/SDBOutput";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType";
import { ControlMode } from "@sproot/sproot-common/dist/outputs/IOutputBase";
import EntryManager from "../EntryManager";

describe("EntryManager.ts tests", () => {
  let sprootDB: Partial<ISprootDB>;
  let mgr: EntryManager;

  beforeEach(() => {
    sprootDB = {
      getJournalEntriesAsync: sinon.stub(),
      getJournalEntryTagLookupsAsync: sinon.stub(),
      getJournalEntryTagsAsync: sinon.stub(),
      getJournalEntryDeviceDataAsync: sinon.stub(),
      addJournalEntryAsync: sinon.stub(),
      addJournalEntryTagLookupAsync: sinon.stub(),
      deleteJournalEntryTagLookupAsync: sinon.stub(),
      getSensorAsync: sinon.stub(),
      getSensorReadingsAsync: sinon.stub(),
      addJournalEntryDeviceDataAsync: sinon.stub(),
      deleteJournalEntryDeviceDataAsync: sinon.stub(),
      getOutputAsync: sinon.stub(),
      getOutputStatesAsync: sinon.stub(),
      deleteJournalEntryAsync: sinon.stub(),
      updateJournalEntryAsync: sinon.stub(),
    };

    mgr = new EntryManager(sprootDB as ISprootDB);
  });

  afterEach(() => sinon.restore());

  it("getEntries maps tags onto entries", async () => {
    const entries: SDBJournalEntry[] = [
      { id: 1, journalId: 10, name: null, text: "e", createDate: "2020-01-01", editedDate: null },
    ];
    const lookups: SDBJournalEntryTagLookup[] = [{ id: 1, journalEntryId: 1, tagId: 5 }];
    const tags: SDBJournalEntryTag[] = [{ id: 5, name: "t", color: null } as SDBJournalEntryTag];

    (sprootDB.getJournalEntriesAsync as sinon.SinonStub).resolves(entries);
    (sprootDB.getJournalEntryTagLookupsAsync as sinon.SinonStub).resolves(lookups);
    (sprootDB.getJournalEntryTagsAsync as sinon.SinonStub).resolves(tags);

    const res = await mgr.getEntries(10);
    assert.strictEqual(res.length, 1);
    const first = res[0];
    assert.isDefined(first);
    const entryTags = first!.tags as SDBJournalEntryTag[];
    assert.isDefined(entryTags);
    assert.strictEqual(entryTags.length, 1);
    assert.strictEqual(entryTags[0]!.id, 5);
  });

  it("getJournalEntryDeviceData delegates to DB", async () => {
    const data: SDBJournalEntryDeviceData[] = [
      { id: 1, journalEntryId: 1, deviceName: "dev", reading: 10, units: "u", readingTime: "t" },
    ];
    (sprootDB.getJournalEntryDeviceDataAsync as sinon.SinonStub).resolves(data);

    const res = await mgr.getJournalEntryDeviceData(1);
    assert.strictEqual(res, data);
  });

  it("createAsync calls addJournalEntryAsync", async () => {
    (sprootDB.addJournalEntryAsync as sinon.SinonStub).resolves(99);
    const id = await mgr.createAsync(1, "text", "name", "2020");
    assert.strictEqual(id, 99);
    sinon.assert.calledWith(
      sprootDB.addJournalEntryAsync as sinon.SinonStub,
      1,
      "name",
      "text",
      "2020",
    );
  });

  it("addTagAsync and removeTagAsync call DB", async () => {
    (sprootDB.addJournalEntryTagLookupAsync as sinon.SinonStub).resolves(3);
    (sprootDB.deleteJournalEntryTagLookupAsync as sinon.SinonStub).resolves();

    const id = await mgr.addTagAsync(1, 2);
    assert.strictEqual(id, 3);
    sinon.assert.calledWith(sprootDB.addJournalEntryTagLookupAsync as sinon.SinonStub, 1, 2);

    await mgr.removeTagAsync(5, 6);
    sinon.assert.calledWith(sprootDB.deleteJournalEntryTagLookupAsync as sinon.SinonStub, 5, 6);
  });

  it("attachSensorDataAsync throws when sensor missing", async () => {
    (sprootDB.getSensorAsync as sinon.SinonStub).resolves([] as SDBSensor[]);

    try {
      await mgr.attachSensorDataAsync(1, 2, new Date(0), new Date(1000));
      assert.fail("Expected error");
    } catch (err) {
      assert.match((err as Error).message, /Sensor 2 not found/);
    }
  });

  it("attachSensorDataAsync adds device data for readings", async () => {
    (sprootDB.getSensorAsync as sinon.SinonStub).resolves([
      {
        id: 2,
        name: "S1",
        model: "DS18B20",
        subcontrollerId: null,
        address: null,
        color: "",
        pin: null,
        deviceZoneId: null,
        lowCalibrationPoint: null,
        highCalibrationPoint: null,
      } as SDBSensor,
    ]);
    const r: SDBReading = {
      metric: ReadingType.temperature,
      data: "10",
      units: "C",
      logTime: "t",
    } as SDBReading;
    (sprootDB.getSensorReadingsAsync as sinon.SinonStub).resolves([r]);
    (sprootDB.addJournalEntryDeviceDataAsync as sinon.SinonStub).resolves(1);

    await mgr.attachSensorDataAsync(1, 2, new Date(0), new Date(60000));

    sinon.assert.calledWith(
      sprootDB.addJournalEntryDeviceDataAsync as sinon.SinonStub,
      1,
      "S1",
      "Sensor",
      r.data,
      r.units,
      r.logTime,
    );
  });

  it("detachSensorDataAsync calls DB", async () => {
    (sprootDB.getSensorAsync as sinon.SinonStub).resolves([
      {
        id: 2,
        name: "S1",
        model: "DS18B20",
        subcontrollerId: null,
        address: null,
        color: "",
        pin: null,
        deviceZoneId: null,
        lowCalibrationPoint: null,
        highCalibrationPoint: null,
      } as SDBSensor,
    ]);
    (sprootDB.deleteJournalEntryDeviceDataAsync as sinon.SinonStub).resolves();

    await mgr.detachSensorDataAsync(1, 2);
    sinon.assert.calledWith(
      sprootDB.deleteJournalEntryDeviceDataAsync as sinon.SinonStub,
      1,
      "S1",
      "Sensor",
    );
  });

  it("attachOutputDataAsync and detachOutputDataAsync work", async () => {
    const out: SDBOutput = {
      id: 3,
      model: "PCA9685",
      subcontrollerId: null,
      address: "a",
      name: "O1",
      pin: "p",
      deviceZoneId: null,
      parentOutputId: null,
      isPwm: false,
      isInvertedPwm: false,
      color: "#fff",
      automationTimeout: 0,
    } as SDBOutput;

    (sprootDB.getOutputAsync as sinon.SinonStub).resolves([out]);
    const d: SDBOutputState = {
      controlMode: ControlMode.automatic,
      value: 1,
      logTime: "lt",
    } as SDBOutputState;
    (sprootDB.getOutputStatesAsync as sinon.SinonStub).resolves([d]);
    (sprootDB.addJournalEntryDeviceDataAsync as sinon.SinonStub).resolves(2);
    (sprootDB.deleteJournalEntryDeviceDataAsync as sinon.SinonStub).resolves();

    await mgr.attachOutputDataAsync(1, 3, new Date(0), new Date(60000));
    sinon.assert.calledWith(
      sprootDB.addJournalEntryDeviceDataAsync as sinon.SinonStub,
      1,
      "O1",
      "Output",
      String(d.value),
      "%",
      d.logTime,
    );

    await mgr.detachOutputDataAsync(1, 3);
    sinon.assert.calledWith(
      sprootDB.deleteJournalEntryDeviceDataAsync as sinon.SinonStub,
      1,
      "O1",
      "Output",
    );
  });

  it("updateAsync and deleteAsync call DB", async () => {
    (sprootDB.updateJournalEntryAsync as sinon.SinonStub).resolves();
    (sprootDB.deleteJournalEntryAsync as sinon.SinonStub).resolves();

    const entry: SDBJournalEntry = {
      id: 7,
      journalId: 1,
      name: null,
      text: "x",
      createDate: "d",
      editedDate: null,
    };
    await mgr.updateAsync(entry);
    sinon.assert.calledWith(sprootDB.updateJournalEntryAsync as sinon.SinonStub, entry);

    await mgr.deleteAsync(8);
    sinon.assert.calledWith(sprootDB.deleteJournalEntryAsync as sinon.SinonStub, 8);
  });
});
