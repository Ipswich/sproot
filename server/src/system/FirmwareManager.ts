import fs from "fs";
import fsPromises from "fs/promises";
import { SerialPort } from "serialport/dist/index";

import {
  ESP32_MANIFEST_PATH,
  ESP32_FIRMWARE_PATH,
  ESP32_BOOTLOADER_PATH,
  ESP32_PARTITIONS_PATH,
  ESP32_BOOTAPP0_PATH,
} from "@sproot/sproot-common/src/utility/Constants";

import type { FlashOptions } from "esptool-js";
import winston from "winston";

class ESP32Manager {
  static async listEspDevicesAsync() {
    const ports = await SerialPort.list();
    return ports.filter((p) => /usb|uart|silabs|ch340|esp/i.test(`${p.manufacturer} ${p.path}`));
  }

  static async flashESP32FirmwareAsync(portPath: string, logger: winston.Logger) {
    const [bootloaderBuf, partitionsBuf, boot_app0Buf, firmwareBuf] = await Promise.all([
      fsPromises.readFile(ESP32_BOOTLOADER_PATH),
      fsPromises.readFile(ESP32_PARTITIONS_PATH),
      fsPromises.readFile(ESP32_BOOTAPP0_PATH),
      fsPromises.readFile(ESP32_FIRMWARE_PATH),
    ]);

    const bootloader = bootloaderBuf.toString("base64");
    const partitions = partitionsBuf.toString("base64");
    const boot_app0 = boot_app0Buf.toString("base64");
    const firmware = firmwareBuf.toString("base64");

    const serial = new SerialPort({ baudRate: 460800, path: portPath });

    // esptool-js is published as an ES module; use dynamic import at runtime to avoid
    // Node trying to load it as CommonJS when this project is CommonJS.
    const esptool = await import("esptool-js");
    const { ESPLoader, Transport } = esptool;

    const transport = new Transport(serial);

    const flashOptions: FlashOptions = {
      fileArray: [
        { address: 0x1000, data: bootloader },
        { address: 0x8000, data: partitions },
        { address: 0xe000, data: boot_app0 },
        { address: 0x10000, data: firmware },
      ],
      flashFreq: "40",
      flashMode: "dio",
      flashSize: "4MB",
      compress: true,
      eraseAll: true,
      reportProgress(fileIndex, written, total) {
        const percent = total ? Math.round((written / total) * 100) : 0;
        logger.info(`Flashing file ${fileIndex + 1}: ${percent}%`);
      },
    };
    const loader = new ESPLoader({
      baudrate: 460800,
      port: portPath,
      romBaudrate: 460800,
      transport,
    });

    try {
      await transport.connect();
      await loader.writeFlash(flashOptions);
      await loader.after();
      await transport.disconnect();
    } catch (err) {
      logger.error(`Error flashing ESP32 firmware: ${(err as Error).message}`);
    }
  }

  static async getESP32ManifestAsync(): Promise<string> {
    const content = await fsPromises.readFile(ESP32_MANIFEST_PATH, "utf8");
    return JSON.parse(content);
  }

  static async getESP32FirmwareBinaryAsync(): Promise<{ stream: fs.ReadStream; size: number }> {
    const stats = await fsPromises.stat(ESP32_FIRMWARE_PATH);
    return { stream: fs.createReadStream(ESP32_FIRMWARE_PATH), size: stats.size };
  }
}

export class FirmwareManager {
  static readonly ESP32 = ESP32Manager;
}
