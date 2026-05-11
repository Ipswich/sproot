import { EventMap } from "./events/EventMap";

export interface IEventBus {
  publishAsync(event: AnySprootEvent): Promise<void>;

  subscribe<T extends keyof EventMap>(
    type: T,
    handler: (event: SprootEvent<T>) => void
  ): Unsubscribe;
}

export type AnySprootEvent = {
  [K in keyof EventMap]: SprootEvent<K>;
}[keyof EventMap];

export interface SprootEvent<TType extends keyof EventMap = keyof EventMap> {
  type: TType;
  payload: EventMap[TType];

  eventId: string;
  occurredAt: Date;

  correlationId?: string;
  causationId?: string;
}

export type Unsubscribe = () => void;