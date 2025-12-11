import { useCallback, useEffect, useRef, useState } from "react";
import { ESPLoader, Transport, FlashOptions } from "esptool-js";
import {
  getSubcontrollerBinaryAsync,
  getSubControllerBootloaderAsync,
  getSubControllerPartitionsAsync,
  getSubControllerApplicationAsync,
} from "@sproot/sproot-client/src/requests/requests_v2";
import { Paper, Stack, Group, Button, Progress, Text } from "@mantine/core";

type LogEntry = {
  time: string;
  level: "info" | "error" | "debug";
  message: string;
};

export default function FlashSubcontroller(): JSX.Element {
  const [isFlashing, setIsFlashing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const pushLog = useCallback((level: LogEntry["level"], message: string) => {
    setLogs((l) => [
      ...l,
      { time: new Date().toLocaleTimeString(), level, message },
    ]);
  }, []);

  const [port, setPort] = useState<unknown | null>(null);

  // minimal transport interface used from esptool-js Transport in browser
  type EsptTransportLike = {
    connect?: (baud?: number, opts?: unknown) => Promise<void>;
    disconnect?: () => Promise<void>;
    setDTR?: (state: boolean) => Promise<void>;
    returnTrace?: () => void;
  };

  const transportRef = useRef<EsptTransportLike | null>(null);
  const loaderRef = useRef<ESPLoader | null>(null);

  useEffect(() => {
    return () => {
      (async () => {
        try {
          const t = transportRef.current;
          if (t && typeof t.disconnect === "function") await t.disconnect();
        } catch (e) {
          // ignore
        }
      })();
    };
  }, []);

  async function connectPort() {
    if (port) {
      pushLog("debug", "Port already selected");
      return;
    }

    const nav = navigator as unknown as {
      serial?: { requestPort?: (opts?: unknown) => Promise<unknown> };
    };
    if (!nav || !nav.serial || typeof nav.serial.requestPort !== "function") {
      pushLog("error", "Web Serial API not available in this browser");
      return;
    }

    try {
      pushLog("info", "Requesting serial port from browser...");
      const p = await nav.serial.requestPort();
      setPort(p);

      // Create esptool transport for browser Web Serial port. We don't open
      // the device here; ESPLoader will handle opening when loader.main()
      // is called.
      const TransportCtor = Transport as unknown as new (
        port: unknown,
        tracing?: boolean,
        enableSlipReader?: boolean,
      ) => EsptTransportLike;

      const t = new TransportCtor(p as unknown, false, true);
      transportRef.current = t;

      pushLog(
        "info",
        "Transport created for selected port (ESPLoader will open it when needed)",
      );
    } catch (err) {
      pushLog("error", `Failed to open serial port: ${(err as Error).message}`);
      throw err;
    }
  }

  async function disconnectPort() {
    try {
      const t = transportRef.current;
      if (t && typeof t.disconnect === "function") {
        pushLog("info", "Disconnecting transport...");
        await t.disconnect();
        transportRef.current = null;
      }
      if (port) setPort(null);
      loaderRef.current = null;
      pushLog("info", "Serial port disconnected");
    } catch (err) {
      pushLog("error", `Error disconnecting port: ${(err as Error).message}`);
    }
  }

  async function flashESP32() {
    if (isFlashing) {
      pushLog("error", "Already flashing");
      return;
    }

    setIsFlashing(true);
    setProgress(0);

    try {
      pushLog("info", "Fetching firmware binaries from server...");
      const [bootloaderB, partitionsB, bootApp0B, firmwareB] =
        await Promise.all([
          getSubControllerBootloaderAsync("esp32"),
          getSubControllerPartitionsAsync("esp32"),
          getSubControllerApplicationAsync("esp32"),
          getSubcontrollerBinaryAsync("esp32"),
        ]);

      const [bootloader, partitions, bootApp0, firmware] = await Promise.all([
        arrayBufferToBinaryString(bootloaderB),
        arrayBufferToBinaryString(partitionsB),
        arrayBufferToBinaryString(bootApp0B),
        arrayBufferToBinaryString(firmwareB),
      ]);

      const flashOptions: FlashOptions = {
        fileArray: [
          { address: 0x1000, data: bootloader },
          { address: 0x8000, data: partitions },
          { address: 0xe000, data: bootApp0 },
          { address: 0x10000, data: firmware },
        ],
        flashFreq: "40",
        flashMode: "dio",
        flashSize: "4MB",
        compress: true,
        eraseAll: true,
        reportProgress(fileIndex: number, written: number, total: number) {
          const percent = total ? Math.round((written / total) * 100) : 0;
          setProgress(percent);
          pushLog("info", `Flashing file ${fileIndex + 1}: ${percent}%`);
        },
      };

      // Ensure transport is available
      if (!transportRef.current) {
        pushLog(
          "info",
          "No transport available, attempting to connect port...",
        );
        await connectPort();
      }
      if (!transportRef.current)
        throw new Error("No transport available for flashing");

      // Prepare loader constructor
      const LoaderCtor = ESPLoader as unknown as new (opts: {
        baudrate?: number;
        romBaudrate?: number;
        transport: unknown;
      }) => ESPLoader;

      const transport = transportRef.current as unknown as EsptTransportLike;
      const romBaudRates = [115200, 460800];
      let initializedLoader: ESPLoader | null = null;

      const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

      pushLog(
        "info",
        "Starting flash process (attempting to initialize loader)...",
      );

      for (const romBaud of romBaudRates) {
        const loader = new LoaderCtor({
          baudrate: 460800,
          romBaudrate: romBaud,
          transport: transportRef.current as unknown,
        });

        try {
          // pushLog("debug", `Trying loader.main() with romBaudrate=${romBaud}`);
          await loader.main();
          pushLog("info", `Initialized loader at romBaudrate=${romBaud}`);
          initializedLoader = loader;
          loaderRef.current = loader;
          break;
        } catch (err) {
          pushLog(
            "error",
            `Loader init failed at romBaudrate=${romBaud}: ${(err as Error).message}`,
          );
          try {
            if (transport && typeof transport.disconnect === "function") {
              await transport.disconnect();
              await sleep(200);
            }
          } catch (e) {
            // ignore
          }
        }
      }

      if (!initializedLoader) throw new Error("Failed to initialize ESPLoader");

      pushLog("info", "Writing firmware...");
      await initializedLoader.writeFlash(flashOptions);
      await initializedLoader.after();

      pushLog("info", "Flashing completed successfully");
      setProgress(100);
    } catch (err) {
      pushLog("error", `Error during flashing: ${(err as Error).message}`);
      setProgress(-1);
    } finally {
      setIsFlashing(false);
    }
  }

  return (
    <Paper withBorder p="md" radius="md" w={"90%"}>
      <Stack>
        <Group justify="space-between">
          <Text fw={600}>ESP32 Flasher</Text>
        </Group>
        <Button
          onClick={async () => {
            await connectPort();
            await flashESP32();
            await disconnectPort();
          }}
          disabled={isFlashing}
          color="blue"
          size="xs"
        >
          Flash
        </Button>
        <Stack>
          <Group align="center" gap="sm" style={{ width: "100%" }}>
            <Text w={"35%"} size="sm">
              Progress: {progress}%
            </Text>
            <Progress
              style={{ flex: 1 }}
              value={progress}
              color={(function () {
                switch (progress) {
                  case -1:
                    return "red";
                  case 0:
                    return "blue";
                  case 100:
                    return "blue";
                  default:
                    return "green";
                }
              })()}
              animated={progress < 100 && progress > 0}
            />
          </Group>
        </Stack>

        <Paper
          withBorder
          p="xs"
          radius="sm"
          style={{ maxHeight: 220, overflow: "auto", background: "#0b1220" }}
        >
          {logs.map((l, i) => (
            <Text key={i} size="xs" c={l.level === "error" ? "red" : "dimmed"}>
              [{l.time}][{l.level}] {l.message}
            </Text>
          ))}
        </Paper>
      </Stack>
    </Paper>
  );
}

function arrayBufferToBinaryString(ab: Uint8Array): string {
  const bytes = new Uint8Array(ab);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return binary;
}
