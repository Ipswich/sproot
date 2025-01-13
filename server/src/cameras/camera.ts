import { SDBCamera } from "@sproot/database/SDBCamera";
import { exec } from "child_process";

export class Camera {
  readonly id: number;
  name: string;
  readonly deviceIdentifier: string;
  resolution: string;
  overlayTimestamp: boolean;
  overlayName: boolean;
  overlayColor: string;
  retentionDays: number;
  frequencyMinutes: number;

  constructor(camera: SDBCamera) {
    this.id = camera.id;
    this.name = camera.name;
    this.deviceIdentifier = camera.deviceIdentifier;
    this.resolution = camera.resolution;
    this.overlayTimestamp = camera.overlayTimestamp;
    this.overlayName = camera.overlayName;
    this.overlayColor = camera.overlayColor;
    this.retentionDays = camera.retentionDays;
    this.frequencyMinutes = camera.frequencyMinutes;
  }

  takeImage(temp: boolean = false): void {
    const filePath = this.getFilePath(temp);
    const args = 
    
    const commandString = `ffmpeg -f v4l2 -video_size ${this.resolution}`



    
  }

  private getFilePath(temp: boolean): string {
    const directory = temp ? `./images/${this.name}/temp` : `./images/${this.name}`;
    const fileName = temp ? "latest.jpg" : `${new Date().toISOString()}.jpg`;

    return `${directory}/image-${fileName}`;
  }
}