import { useEffect, useRef } from "react";
import {
  Accordion,
  Badge,
  Box,
  Group,
  ScrollArea,
  Stack,
  Text,
} from "@mantine/core";
import { IconActivityHeartbeat } from "@tabler/icons-react";
import type { SystemLogEvent } from "../../../requests/requests_v2";
import {
  formatLogTimestamp,
  getConnectionBadgeColor,
  getLogLevelColor,
  useSystemLogStream,
} from "./useSystemLogStream";

export default function LogStreamWithBadges() {
  const { latestLogLabel, logConnectionState, logEntries, logStreamError } =
    useSystemLogStream();
  const logBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    logBottomRef.current?.scrollIntoView({ block: "end" });
  }, [logEntries]);

  return (
    <Accordion.Item value="logs">
      <Accordion.Control icon={<IconActivityHeartbeat />}>
        Log Stream
      </Accordion.Control>
      <Accordion.Panel>
        <Stack gap="sm">
          <Group justify="space-between" align="center">
            <Group gap="xs">
              <Badge
                color={getConnectionBadgeColor(logConnectionState)}
                variant="light"
              >
                {logConnectionState}
              </Badge>
              <Text size="sm" c="dimmed">
                Replays recent history and follows new server activity.
              </Text>
            </Group>
            <Text size="xs" c="dimmed">
              {latestLogLabel}
            </Text>
          </Group>

          {logStreamError && (
            <Text size="sm" c="yellow.7">
              {logStreamError}
            </Text>
          )}

          <ScrollArea h={320} offsetScrollbars scrollbarSize={8}>
            <Stack gap="xs">
              {logEntries.length === 0 ? (
                <Box
                  p="md"
                  style={{
                    border: "1px dashed var(--mantine-color-gray-4)",
                    borderRadius: "var(--mantine-radius-md)",
                  }}
                >
                  <Text size="sm" c="dimmed">
                    No log entries received yet.
                  </Text>
                </Box>
              ) : (
                logEntries.map((logEntry: SystemLogEvent, index: number) => {
                  const metadata = logEntry.metadata
                    ? JSON.stringify(logEntry.metadata)
                    : null;
                  const levelColor = getLogLevelColor(logEntry.level);

                  return (
                    <Box
                      key={`${logEntry.timestamp}-${logEntry.level}-${index}`}
                      p="sm"
                      style={{
                        border: "1px solid var(--mantine-color-gray-3)",
                        borderLeft: `4px solid var(--mantine-color-${levelColor}-6)`,
                        borderRadius: "var(--mantine-radius-md)",
                        background: "var(--mantine-color-body)",
                      }}
                    >
                      <Group
                        justify="space-between"
                        align="flex-start"
                        gap="sm"
                      >
                        <Badge color={levelColor} variant="light" radius="sm">
                          {logEntry.level}
                        </Badge>
                        <Text size="xs" c="dimmed" ff="monospace">
                          {formatLogTimestamp(logEntry.timestamp)}
                        </Text>
                      </Group>
                      <Text mt={6} size="sm" ff="monospace">
                        {logEntry.message}
                      </Text>
                      {metadata && (
                        <Text
                          mt={6}
                          size="xs"
                          c="dimmed"
                          ff="monospace"
                          style={{ wordBreak: "break-word" }}
                        >
                          {metadata}
                        </Text>
                      )}
                    </Box>
                  );
                })
              )}
              <div ref={logBottomRef} />
            </Stack>
          </ScrollArea>
        </Stack>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
