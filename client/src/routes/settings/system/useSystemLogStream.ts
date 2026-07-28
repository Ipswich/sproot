import { useEffect, useState } from "react";
import {
  getSystemLogStreamUrl,
  type SystemLogEvent,
} from "../../../requests/requests_v2";

const MAX_LOG_ENTRIES = 200;

export type LogConnectionState = "connecting" | "connected" | "reconnecting";

export function stripAnsiEscapeCodes(value: string) {
  let sanitizedValue = "";

  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) === 27 && value[index + 1] === "[") {
      index += 2;

      while (index < value.length && value[index] !== "m") {
        index += 1;
      }

      continue;
    }

    sanitizedValue += value[index];
  }

  return sanitizedValue.trim();
}

export function getLogLevelColor(level: string) {
  switch (stripAnsiEscapeCodes(level).toLowerCase()) {
    case "error":
      return "red";
    case "warn":
    case "warning":
      return "yellow";
    case "debug":
      return "grape";
    default:
      return "teal";
  }
}

export function getConnectionBadgeColor(connectionState: LogConnectionState) {
  switch (connectionState) {
    case "connected":
      return "teal";
    case "reconnecting":
      return "yellow";
    default:
      return "blue";
  }
}

export function formatLogTimestamp(timestamp: string) {
  const parsedTimestamp = new Date(timestamp);

  if (Number.isNaN(parsedTimestamp.getTime())) {
    return timestamp;
  }

  return parsedTimestamp.toLocaleString();
}

export function getLatestLogLabel(latestLogTimestamp: string | null) {
  return latestLogTimestamp
    ? `Last event ${formatLogTimestamp(latestLogTimestamp)}`
    : "Waiting for log activity";
}

export function useSystemLogStream() {
  const [logEntries, setLogEntries] = useState<SystemLogEvent[]>([]);
  const [logConnectionState, setLogConnectionState] =
    useState<LogConnectionState>("connecting");
  const [logStreamError, setLogStreamError] = useState<string | null>(null);
  const [latestLogTimestamp, setLatestLogTimestamp] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const eventSource = new EventSource(getSystemLogStreamUrl());

    setLogConnectionState("connecting");
    setLogStreamError(null);

    eventSource.onopen = () => {
      setLogConnectionState("connected");
      setLogStreamError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const nextLog = JSON.parse(event.data) as SystemLogEvent;
        const normalizedLog = {
          ...nextLog,
          level: stripAnsiEscapeCodes(nextLog.level),
          message: stripAnsiEscapeCodes(nextLog.message),
        };

        setLogEntries((currentLogEntries: SystemLogEvent[]) => {
          const updatedEntries = [...currentLogEntries, normalizedLog];
          return updatedEntries.slice(-MAX_LOG_ENTRIES);
        });
        setLatestLogTimestamp(normalizedLog.timestamp);
        setLogConnectionState("connected");
        setLogStreamError(null);
      } catch {
        setLogStreamError("Received an unreadable log event.");
      }
    };

    eventSource.onerror = () => {
      setLogConnectionState("reconnecting");
      setLogStreamError("Live stream interrupted. Retrying automatically.");
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return {
    logEntries,
    logConnectionState,
    logStreamError,
    latestLogTimestamp,
    latestLogLabel: getLatestLogLabel(latestLogTimestamp),
  };
}
