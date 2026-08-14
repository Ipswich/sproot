import { assert } from "chai";
import sinon from "sinon";
import winston from "winston";
import { DebugLoggingService } from "../DebugLoggingService";
import { ISettingsRepository } from "../../database/settings/ISettingsRepository";
import { SETTINGS } from "../../database/settings/SettingsSchema";
import { MemoryEventBus } from "../../eventbus/MemoryEventBus";
import { Events } from "../../eventbus/events/Events";
import { DebugLoggingController } from "../../logger";
import { createEvent } from "../../eventbus/IEventBus";

describe("DebugLoggingService", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("applies the persisted setting during createInstanceAsync", async () => {
    const settingsRepository = {
      getAsync: sinon.stub().withArgs(SETTINGS.system.log_debug).resolves(true),
    } as Partial<ISettingsRepository> as ISettingsRepository;
    const eventBus = new MemoryEventBus(winston.createLogger({ silent: true }));
    const logger = winston.createLogger({ silent: true });
    const controller = {
      setEnabled: sinon.stub().returns(true),
    } as unknown as DebugLoggingController;

    const service = await DebugLoggingService.createInstanceAsync(
      settingsRepository,
      eventBus,
      controller,
      logger,
    );

    assert.strictEqual(service.constructor.name, "DebugLoggingService");
    assert.isTrue((controller.setEnabled as sinon.SinonStub).calledOnceWith(true));
    service[Symbol.dispose]();
  });

  it("responds to system.log_debug.updated events", async () => {
    const settingsRepository = {
      getAsync: sinon.stub().withArgs(SETTINGS.system.log_debug).resolves(false),
    } as Partial<ISettingsRepository> as ISettingsRepository;
    const eventBus = new MemoryEventBus(winston.createLogger({ silent: true }));
    const logger = winston.createLogger({ silent: true });
    const controller = {
      setEnabled: sinon.stub().returns(true),
    } as unknown as DebugLoggingController;

    const service = await DebugLoggingService.createInstanceAsync(
      settingsRepository,
      eventBus,
      controller,
      logger,
    );

    await eventBus.publishAsync(
      createEvent(Events.SYSTEM_LOG_DEBUG_UPDATED, {
        key: SETTINGS.system.log_debug,
        value: true,
      }),
    );

    assert.isTrue((controller.setEnabled as sinon.SinonStub).calledTwice);
    assert.isTrue((controller.setEnabled as sinon.SinonStub).secondCall.calledWith(true));
    service[Symbol.dispose]();
  });
});
