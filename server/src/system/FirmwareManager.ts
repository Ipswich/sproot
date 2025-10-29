import fs from "fs";
import fsPromises from "fs/promises";
import { SerialPort } from "serialport/dist/index";

import {
  ESP32_FIRMWARE_MANIFEST_PATH,
  ESP32_FIRMWARE_BINARY_PATH,
} from "@sproot/sproot-common/src/utility/Constants";

// import { ESPLoader } from 'esptool-js';

class ESP32Manager {
  static async listEspDevicesAsync() {
    const ports = await SerialPort.list();
    return ports.filter((p) => /usb|uart|silabs|ch340|esp/i.test(`${p.manufacturer} ${p.path}`));
  }

  // static async writeValueToESP32Preferences(portPath: string, key: string, value: string) {
  //   const port = new SerialPort(portPath, { baudRate: 115200 });
  //   await new Promise(res => port.on("open", res));

  // }

  static async getESP32ManifestAsync(): Promise<string> {
    const content = await fsPromises.readFile(ESP32_FIRMWARE_MANIFEST_PATH, "utf8");
    return JSON.parse(content);
  }

  static async getESP32FirmwareBinaryAsync(): Promise<{ stream: fs.ReadStream; size: number }> {
    const stats = await fsPromises.stat(ESP32_FIRMWARE_BINARY_PATH);
    return { stream: fs.createReadStream(ESP32_FIRMWARE_BINARY_PATH), size: stats.size };
  }
}

export class FirmwareManager {
  static readonly ESP32 = ESP32Manager;
}
