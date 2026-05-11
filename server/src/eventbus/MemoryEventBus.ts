import winston from "winston";
import { IEventBus, SprootEvent, Unsubscribe } from "./IEventBus";
import { EventMap } from "./events/EventMap";

export class MemoryEventBus implements IEventBus {
  #logger: winston.Logger;
  #handlers = new Map<keyof EventMap, Set<(event: SprootEvent) => any>>();

  constructor(logger: winston.Logger) {
    this.#logger = logger;
  }

  async publishAsync(event: SprootEvent): Promise<void> {
    const handlers = this.#handlers.get(event.type);

    if (!handlers) {
      return;
    }

    await Promise.all(
      [...handlers].map(async (handler) => {
        try {
          await handler(event);
        } catch (err) {
          this.#logger.error(`Error handling event ${event.type}: ${err}`);
        }
      }),
    );
  }

  subscribe<T extends keyof EventMap>(
    type: T,
    handler: (event: SprootEvent<T>) => void,
  ): Unsubscribe {
    if (!this.#handlers.has(type)) {
      this.#handlers.set(type, new Set());
    }

    const handlers = this.#handlers.get(type)!;

    handlers.add(handler as any);

    return () => {
      handlers.delete(handler as any);
    };
  }
}
