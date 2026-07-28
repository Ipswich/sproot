import { Request, Response } from "express";
import { DI_KEYS } from "../../../utils/DependencyInjectionConstants";
import { Events } from "../../../eventbus/events/Events";
import { IEventBus } from "../../../eventbus/IEventBus";
import { LogStreamService } from "../../../system/LogStreamService";

function safeWrite(res: Response, data: string): void {
  if (res.writableEnded) return;
  res.write(data);
}

export function logStreamHandler(req: Request, res: Response): void {
  const logStreamService = req.app.get(DI_KEYS.LogStreamService) as LogStreamService;
  const eventBus = req.app.get(DI_KEYS.EventBus) as IEventBus;

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Track history event IDs to avoid duplicates during history→live transition.
  const historyEventIds = new Set<string>();

  // Send history (oldest → newest) as full LogEvent objects
  const history = logStreamService.getHistory();
  for (const event of history) {
    if (res.writableEnded) return;
    historyEventIds.add(event.eventId);
    safeWrite(res, `data: ${JSON.stringify(event.payload)}\n\n`);
  }

  // Subscribe to new events
  const unsubscribe = eventBus.subscribe(Events.LOG_EVENT, (event) => {
    if (!historyEventIds.has(event.eventId)) {
      safeWrite(res, `data: ${JSON.stringify(event.payload)}\n\n`);
    }
  });

  // Heartbeat timer
  const heartbeatInterval = setInterval(() => {
    if (!res.writableEnded) {
      safeWrite(res, ": heartbeat\n\n");
    }
  }, 30_000);

  // Clean up on disconnect
  res.on("close", () => {
    clearInterval(heartbeatInterval);
    unsubscribe();
  });
}
