import { GDBOutput } from "./database-objects/GDBOutput";
import { IGrowthDB } from "./database-objects/IGrowthDB";

abstract class OutputBase {
  id: number;
  description: string | null;
  pin: number;
  isPwm: boolean;
  isInvertedPwm: boolean;
  growthDB: IGrowthDB;

  constructor(gdbOutput: GDBOutput, growthDB: IGrowthDB) {
    this.id = gdbOutput.id;
    this.description = gdbOutput.description;
    this.pin = gdbOutput.pin;
    this.isPwm = gdbOutput.isPwm;
    this.isInvertedPwm = gdbOutput.isInvertedPwm;
    this.growthDB = growthDB;
  }

  abstract turnOn(value: number): Promise<void>;
  abstract turnOff(value: number): Promise<void>;
}

abstract class PWMOutputBase extends OutputBase {
  abstract setPwm(value: number): Promise<void>;
}

export { OutputBase, PWMOutputBase };