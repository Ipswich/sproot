import { assert } from "chai";
import sinon from "sinon";
import { Request, Response } from "express";
import { SuccessResponse, ErrorResponse } from "@sproot/sproot-common/dist/api/v2/Responses";
import JournalService from "../../../../journals/JournalService";

import {
  getSensorDataAsync,
  getOutputDataAsync,
  putSensorDataAsync,
  putOutputDataAsync,
  deleteSensorDataAsync,
  deleteOutputDataAsync,
} from "../handlers/JournalEntriesDataHandlers";

describe("JournalEntriesDataHandlers", () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  const makeRes = () => {
    const res: Partial<Response> = {
      locals: { defaultProperties: {} },
    };
    return res as Response;
  };

  describe("getSensorDataAsync", () => {
    it("returns 400 when entryId invalid", async () => {
      const journalService = new JournalService({} as any);
      const req = {
        params: { entryId: "bad" },
        originalUrl: "/api/v2/entries/bad/sensor-data",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await getSensorDataAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 400);
      const err = result.error;
      assert.isArray(err.details);
      assert.includeMembers(err.details, ["Valid Journal Entry ID is required."]);
    });

    it("returns 200 with data when found", async () => {
      const journalService = new JournalService({} as any);
      const sample = [
        {
          id: 1,
          journalEntryId: 5,
          deviceName: "sensor-1",
          reading: 42,
          units: "C",
          readingTime: new Date().toISOString(),
        },
      ];
      sandbox.stub(journalService.entryManager, "getDeviceDataAsync").resolves(sample);

      const req = {
        params: { entryId: "5" },
        originalUrl: "/api/v2/entries/5/sensor-data",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await getSensorDataAsync(req, res)) as SuccessResponse;
      assert.equal(result.statusCode, 200);
      assert.exists(result.content);
      assert.isArray(result.content!.data);
      assert.equal(result.content!.data[0].id, 1);
    });

    it("returns 503 when service throws", async () => {
      const journalService = new JournalService({} as any);
      sandbox.stub(journalService.entryManager, "getDeviceDataAsync").rejects(new Error("boom"));

      const req = {
        params: { entryId: "5" },
        originalUrl: "/api/v2/entries/5/sensor-data",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await getSensorDataAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 503);
      const err = result.error;
      assert.exists(err);
      assert.isArray(err.details);
      assert.include(err.details[0], "Failed to retrieve sensor data for journal entry 5:");
    });
  });

  describe("getOutputDataAsync", () => {
    it("returns 400 when entryId invalid", async () => {
      const journalService = new JournalService({} as any);
      const req = {
        params: { entryId: "bad" },
        originalUrl: "/api/v2/entries/bad/output-data",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await getOutputDataAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 400);
      const err = result.error;
      assert.isArray(err.details);
      assert.includeMembers(err.details, ["Valid Journal Entry ID is required."]);
    });

    it("returns 200 with data when found", async () => {
      const journalService = new JournalService({} as any);
      const sample = [
        {
          id: 2,
          journalEntryId: 5,
          deviceName: "output-1",
          reading: 1,
          units: "on/off",
          readingTime: new Date().toISOString(),
        },
      ];
      sandbox.stub(journalService.entryManager, "getDeviceDataAsync").resolves(sample);

      const req = {
        params: { entryId: "5" },
        originalUrl: "/api/v2/entries/5/output-data",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await getOutputDataAsync(req, res)) as SuccessResponse;
      assert.equal(result.statusCode, 200);
      assert.exists(result.content);
      assert.isArray(result.content!.data);
      assert.equal(result.content!.data[0].id, 2);
    });

    it("returns 503 when service throws", async () => {
      const journalService = new JournalService({} as any);
      sandbox.stub(journalService.entryManager, "getDeviceDataAsync").rejects(new Error("boom"));

      const req = {
        params: { entryId: "5" },
        originalUrl: "/api/v2/entries/5/output-data",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await getOutputDataAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 503);
      const err = result.error;
      assert.exists(err);
      assert.isArray(err.details);
      assert.include(err.details[0], "Failed to retrieve output data for journal entry 5: boom");
    });
  });

  describe("putSensorDataAsync", () => {
    it("returns 400 when params invalid", async () => {
      const journalService = new JournalService({} as any);
      const req = {
        params: { entryId: "x" },
        body: {},
        originalUrl: "/api/v2/entries/x/sensor-data",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await putSensorDataAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 400);
      const err = result.error;
      assert.isArray(err.details);
      assert.includeMembers(err.details, [
        "Valid Journal Entry ID is required.",
        "Valid Sensor ID is required.",
        "Valid start date is required.",
        "Valid end date is required.",
      ]);
    });

    it("returns 200 when attach succeeds", async () => {
      const journalService = new JournalService({} as any);
      sandbox.stub(journalService.entryManager, "detachSensorDataAsync").resolves();
      sandbox.stub(journalService.entryManager, "attachSensorDataAsync").resolves();

      const req = {
        params: { entryId: "5" },
        body: {
          sensorId: 3,
          start: new Date(Date.now() - 10000).toISOString(),
          end: new Date().toISOString(),
        },
        originalUrl: "/api/v2/entries/5/sensor-data",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await putSensorDataAsync(req, res)) as SuccessResponse;
      assert.equal(result.statusCode, 200);
    });

    it("returns 503 when service throws", async () => {
      const journalService = new JournalService({} as any);
      sandbox.stub(journalService.entryManager, "detachSensorDataAsync").resolves();
      sandbox.stub(journalService.entryManager, "attachSensorDataAsync").rejects(new Error("boom"));

      const req = {
        params: { entryId: "5" },
        body: {
          sensorId: 3,
          start: new Date(Date.now() - 10000).toISOString(),
          end: new Date().toISOString(),
        },
        originalUrl: "/api/v2/entries/5/sensor-data",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await putSensorDataAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 503);
      const err = result.error;
      assert.exists(err);
      assert.isArray(err.details);
      assert.include(err.details[0], "Failed to attach sensor data to journal entry 5: boom");
    });
  });

  describe("putOutputDataAsync", () => {
    it("returns 400 when params invalid", async () => {
      const journalService = new JournalService({} as any);
      const req = {
        params: { entryId: "x" },
        body: {},
        originalUrl: "/api/v2/entries/x/output-data",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await putOutputDataAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 400);
      const err = result.error;
      assert.isArray(err.details);
      assert.includeMembers(err.details, [
        "Valid Journal Entry ID is required.",
        "Valid Output ID is required.",
        "Valid start date is required.",
        "Valid end date is required.",
      ]);
    });

    it("returns 200 when attach succeeds", async () => {
      const journalService = new JournalService({} as any);
      sandbox.stub(journalService.entryManager, "detachOutputDataAsync").resolves();
      sandbox.stub(journalService.entryManager, "attachOutputDataAsync").resolves();

      const req = {
        params: { entryId: "5" },
        body: {
          outputId: 4,
          start: new Date(Date.now() - 10000).toISOString(),
          end: new Date().toISOString(),
        },
        originalUrl: "/api/v2/entries/5/output-data",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await putOutputDataAsync(req, res)) as SuccessResponse;
      assert.equal(result.statusCode, 200);
    });

    it("returns 503 when service throws", async () => {
      const journalService = new JournalService({} as any);
      sandbox.stub(journalService.entryManager, "detachOutputDataAsync").resolves();
      sandbox.stub(journalService.entryManager, "attachOutputDataAsync").rejects(new Error("boom"));

      const req = {
        params: { entryId: "5" },
        body: {
          outputId: 4,
          start: new Date(Date.now() - 10000).toISOString(),
          end: new Date().toISOString(),
        },
        originalUrl: "/api/v2/entries/5/output-data",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await putOutputDataAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 503);
      const err = result.error;
      assert.exists(err);
      assert.isArray(err.details);
      assert.include(err.details[0], "Failed to attach output data to journal entry 5: boom");
    });
  });

  describe("deleteSensorDataAsync", () => {
    it("returns 400 when ids invalid", async () => {
      const journalService = new JournalService({} as any);
      const req = {
        params: { journalId: "x", entryId: "y", sensorId: "z" },
        originalUrl: "/api/v2/entries/y/sensor-data/z",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await deleteSensorDataAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 400);
      const err = result.error;
      assert.isArray(err.details);
      assert.includeMembers(err.details, [
        "Valid Journal Entry ID is required.",
        "Valid Sensor ID is required.",
      ]);
    });

    it("returns 200 when detach succeeds", async () => {
      const journalService = new JournalService({} as any);
      sandbox.stub(journalService.entryManager, "detachSensorDataAsync").resolves();

      const req = {
        params: { journalId: "2", entryId: "5", sensorId: "3" },
        originalUrl: "/api/v2/entries/5/sensor-data/3",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await deleteSensorDataAsync(req, res)) as SuccessResponse;
      assert.equal(result.statusCode, 200);
    });

    it("returns 503 when detach throws", async () => {
      const journalService = new JournalService({} as any);
      sandbox.stub(journalService.entryManager, "detachSensorDataAsync").rejects(new Error("boom"));

      const req = {
        params: { journalId: "2", entryId: "5", sensorId: "3" },
        originalUrl: "/api/v2/entries/5/sensor-data/3",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await deleteSensorDataAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 503);
      const err = result.error;
      assert.exists(err);
      assert.isArray(err.details);
      assert.include(err.details[0], "Failed to detach sensor data from journal entry 5: boom");
    });
  });

  describe("deleteOutputDataAsync", () => {
    it("returns 400 when ids invalid", async () => {
      const journalService = new JournalService({} as any);
      const req = {
        params: { journalId: "x", entryId: "y", outputId: "z" },
        originalUrl: "/api/v2/entries/y/output-data/z",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await deleteOutputDataAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 400);
      const err = result.error;
      assert.isArray(err.details);
      assert.includeMembers(err.details, [
        "Valid Journal Entry ID is required.",
        "Valid Output ID is required.",
      ]);
    });

    it("returns 200 when detach succeeds", async () => {
      const journalService = new JournalService({} as any);
      sandbox.stub(journalService.entryManager, "detachOutputDataAsync").resolves();

      const req = {
        params: { journalId: "2", entryId: "5", outputId: "4" },
        originalUrl: "/api/v2/entries/5/output-data/4",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await deleteOutputDataAsync(req, res)) as SuccessResponse;
      assert.equal(result.statusCode, 200);
    });

    it("returns 503 when detach throws", async () => {
      const journalService = new JournalService({} as any);
      sandbox.stub(journalService.entryManager, "detachOutputDataAsync").rejects(new Error("boom"));

      const req = {
        params: { journalId: "2", entryId: "5", outputId: "4" },
        originalUrl: "/api/v2/entries/5/output-data/4",
        app: { get: () => journalService },
      } as unknown as Request;

      const res = makeRes();
      const result = (await deleteOutputDataAsync(req, res)) as ErrorResponse;
      assert.equal(result.statusCode, 503);
      const err = result.error;
      assert.exists(err);
      assert.isArray(err.details);
      assert.include(err.details[0], "Failed to detach output data from journal entry 5: boom");
    });
  });
});
