import { useEffect, useRef, useState } from "react";
import {
  Accordion,
  Badge,
  Box,
  Center,
  Group,
  Loader,
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

function getTerminalAccent(level: string) {
  switch (getLogLevelColor(level)) {
    case "red":
      return "var(--mantine-color-red-4)";
    case "yellow":
      return "var(--mantine-color-yellow-4)";
    case "grape":
      return "var(--mantine-color-grape-4)";
    default:
      return "var(--mantine-color-teal-4)";
  }
}

export default function LogStreamWithTerminal() {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const isLogsExpanded = expandedItems.includes("logs");

  const { latestLogLabel, logConnectionState, logEntries, logStreamError } =
    useSystemLogStream(isLogsExpanded);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const isAtBottom = useRef(true);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      isAtBottom.current = scrollHeight - scrollTop - clientHeight < 50;
    };

    viewport.addEventListener("scroll", handleScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isAtBottom.current && viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [logEntries]);

  return (
    <Accordion value={expandedItems} onChange={setExpandedItems} multiple>
      <Accordion.Item value="logs">
        <Accordion.Control icon={<IconActivityHeartbeat />}>
          Log Stream
        </Accordion.Control>
        <Accordion.Panel>
          <Stack gap="sm">
            {/* <Group justify="space-between" align="center">
            <Group gap="xs">
              <Badge
                color={getConnectionBadgeColor(logConnectionState)}
                variant="light"
              >
                {logConnectionState}
              </Badge>
            <Text size="xs" c="dimmed">
              {latestLogLabel}
            </Text>
            </Group>
          </Group> */}

            {logStreamError && (
              <Text size="sm" c="yellow.7">
                {logStreamError}
              </Text>
            )}

            <Box
              p="sm"
              style={{
                background:
                  "linear-gradient(180deg, rgb(17 24 39) 0%, rgb(12 18 30) 100%)",
                border: "1px solid rgba(148, 163, 184, 0.22)",
                borderRadius: "var(--mantine-radius-md)",
                boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.03)",
              }}
            >
              <Group justify="space-between" align="center" mb="xs">
                <Group gap="xs">
                  <Badge
                    color={getConnectionBadgeColor(logConnectionState)}
                    variant="light"
                  >
                    {logConnectionState}
                  </Badge>
                  <Text size="xs" c="dimmed">
                    {latestLogLabel}
                  </Text>
                </Group>
              </Group>

              <ScrollArea
                h={320}
                viewportRef={viewportRef}
                offsetScrollbars
                scrollbarSize={8}
              >
                {logConnectionState !== "connected" &&
                logConnectionState !== "reconnecting" ? (
                  <Center h="100%">
                    <Loader size="sm" />
                  </Center>
                ) : (
                  <Stack gap={4}>
                    {logEntries.length === 0 ? (
                      <Text size="sm" ff="monospace" c="gray.5">
                        Awaiting server output...
                      </Text>
                    ) : (
                      logEntries.map(
                        (logEntry: SystemLogEvent, index: number) => {
                          const metadata = logEntry.metadata
                            ? JSON.stringify(logEntry.metadata)
                            : null;
                          const accentColor = getTerminalAccent(logEntry.level);

                          return (
                            <Box
                              key={`${logEntry.timestamp}-${logEntry.level}-${index}`}
                            >
                              <Text
                                fz="xs"
                                size="sm"
                                ff="monospace"
                                style={{
                                  color: "rgb(226 232 240)",
                                  lineHeight: 1.6,
                                }}
                              >
                                <Text span c="gray.5" inherit>
                                  {formatLogTimestamp(logEntry.timestamp)}
                                </Text>{" "}
                                <Text
                                  span
                                  inherit
                                  style={{
                                    color: accentColor,
                                    fontWeight: 700,
                                  }}
                                >
                                  [{logEntry.level.toUpperCase()}]
                                </Text>{" "}
                                <Text span inherit>
                                  {logEntry.message}
                                </Text>
                              </Text>
                              {metadata && (
                                <Text
                                  pl="md"
                                  size="xs"
                                  ff="monospace"
                                  style={{
                                    color: "rgb(148 163 184)",
                                    wordBreak: "break-word",
                                  }}
                                >
                                  {metadata}
                                </Text>
                              )}
                            </Box>
                          );
                        },
                      )
                    )}
                  </Stack>
                )}
              </ScrollArea>
            </Box>
          </Stack>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}
