import { SDBUser } from "@sproot/sproot-common/dist/database/SDBUser";
import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import { SDBOutput } from "@sproot/sproot-common/dist/database/SDBOutput";
import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { ISensorBase } from "@sproot/sproot-common/dist/sensors/ISensorBase";
import { SDBReading } from "@sproot/sproot-common/dist/database/SDBReading";
import { SDBOutputState } from "@sproot/sproot-common/dist/database/SDBOutputState";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType";
import { ControlMode, IOutputBase } from "@sproot/outputs/IOutputBase";
import { SDBAutomation } from "@sproot/database/SDBAutomation";
import { SDBOutputCondition } from "@sproot/sproot-common/dist/database/SDBOutputCondition";
import { SDBSensorCondition } from "@sproot/sproot-common/dist/database/SDBSensorCondition";
import { SDBTimeCondition } from "@sproot/sproot-common/dist/database/SDBTimeCondition";
import { ConditionGroupType, ConditionOperator } from "@sproot/automation/ConditionTypes";
import { AutomationOperator } from "@sproot/automation/IAutomation";
import {
  SDBOutputAction,
  SDBOutputActionView,
} from "@sproot/sproot-common/dist/database/SDBOutputAction";
import { Knex } from "knex";
import { IOutputCondition } from "@sproot/automation/IOutputCondition";
import { ISensorCondition } from "@sproot/automation/ISensorCondition";
import { ITimeCondition } from "@sproot/automation/ITimeCondition";
import { IWeekdayCondition } from "@sproot/automation/IWeekdayCondition";
import { SDBWeekdayCondition } from "@sproot/database/SDBWeekdayCondition";
import { SDBCameraSettings } from "@sproot/database/SDBCameraSettings";
import { SDBExternalDevice } from "@sproot/database/SDBExternalDevice";
import { encrypt, decrypt } from "@sproot/sproot-common/dist/utility/Crypto";

export class SprootDB implements ISprootDB {
  #connection: Knex;

  constructor(connection: Knex) {
    this.#connection = connection;
  }

  async getSensorsAsync(): Promise<SDBSensor[]> {
    return this.#connection("sensors as s")
      .leftJoin("external_devices as ed", "s.externalDevice_id", "ed.id")
      .select(
        "s.*",
        "ed.name as externalDeviceName",
        "ed.address as externalAddress",
        "ed.secureToken",
      );
  }
  async getSensorAsync(id: number): Promise<SDBSensor[]> {
    return this.#connection("sensors as s")
      .where("s.id", id)
      .leftJoin("external_devices as ed", "s.externalDevice_id", "ed.id")
      .select(
        "s.*",
        "ed.name as externalDeviceName",
        "ed.address as externalAddress",
        "ed.secureToken",
      );
  }
  async getDS18B20AddressesAsync(): Promise<SDBSensor[]> {
    return this.#connection("sensors as s")
      .leftJoin("external_devices as ed", "s.externalDevice_id", "ed.id")
      .select("s.address", "ed.address as externalAddress")
      .whereIn("s.model", ["DS18B20", "ESP32_DS18B20"]);
  }
  async addSensorAsync(sensor: SDBSensor): Promise<void> {
    return this.#connection("sensors").insert(sensor);
  }
  async updateSensorAsync(sensor: SDBSensor): Promise<void> {
    return this.#connection("sensors").where("id", sensor.id).update({
      name: sensor.name,
      model: sensor.model,
      address: sensor.address,
      color: sensor.color,
      pin: sensor.pin,
      lowCalibrationPoint: sensor.lowCalibrationPoint,
      highCalibrationPoint: sensor.highCalibrationPoint,
    });
  }

  async updateSensorCalibrationAsync(
    sensorId: number,
    lowCalibrationPoint: number | null,
    highCalibrationPoint: number | null,
  ): Promise<void> {
    return this.#connection("sensors").where("id", sensorId).update({
      lowCalibrationPoint: lowCalibrationPoint,
      highCalibrationPoint: highCalibrationPoint,
    });
  }

  async deleteSensorAsync(id: number): Promise<void> {
    return this.#connection("sensors").where("id", id).delete();
  }

  async getExternalDevicesAsync(): Promise<SDBExternalDevice[]> {
    const result = await this.#connection("external_devices").select("*");
    result.forEach((device) => {
      device.secureToken =
        device.secureToken == null ? null : decrypt(device.secureToken, process.env["JWT_SECRET"]!);
    });
    return result;
  }

  async addExternalDeviceAsync(externalDevice: SDBExternalDevice): Promise<void> {
    const copy = { ...externalDevice };
    copy.secureToken =
      copy.secureToken == null ? null : encrypt(copy.secureToken, process.env["JWT_SECRET"]!);

    return this.#connection("external_devices").insert(copy);
  }

  async deleteExternalDeviceAsync(id: number): Promise<void> {
    return this.#connection("external_devices").where("id", id).delete();
  }

  async addSensorReadingAsync(sensor: ISensorBase): Promise<void> {
    const promises = [];
    for (const readingType in sensor.lastReading) {
      promises.push(
        this.#connection("sensor_data").insert({
          sensor_id: sensor.id,
          metric: readingType,
          data: sensor.lastReading[readingType as ReadingType],
          units: sensor.units[readingType as ReadingType],
          logTime: new Date().toISOString().slice(0, 19).replace("T", " "),
        }),
      );
    }
    await Promise.allSettled(promises);
  }
  async getSensorReadingsAsync(
    sensor: ISensorBase | { id: number },
    since: Date,
    minutes: number,
    toIsoString: boolean = false,
  ): Promise<SDBReading[]> {
    const readings = await this.#connection("sensors as s")
      .join("sensor_data as d", "s.id", "d.sensor_id")
      .select("metric", "data", "units", "logTime")
      .where(
        "d.logTime",
        ">",
        this.#connection.raw("DATE_SUB(?, INTERVAL ? MINUTE)", [since.toISOString(), minutes]),
      )
      .andWhere("d.sensor_id", sensor.id)
      .orderBy("d.logTime", "asc");

    if (toIsoString) {
      for (const reading of readings) {
        reading.logTime = reading.logTime.replace(" ", "T") + "Z";
      }
    }
    return readings;
  }
  async getOutputsAsync(): Promise<SDBOutput[]> {
    return this.#connection("outputs as o")
      .leftJoin("external_devices as ed", "o.externalDevice_id", "ed.id")
      .select(
        "o.*",
        "ed.name as externalDeviceName",
        "ed.address as externalAddress",
        "ed.secureToken",
      );
  }
  async getOutputAsync(id: number): Promise<SDBOutput[]> {
    return this.#connection("outputs as o")
      .where("o.id", id)
      .leftJoin("external_devices as ed", "o.externalDevice_id", "ed.id")
      .select(
        "o.*",
        "ed.name as externalDeviceName",
        "ed.address as externalAddress",
        "ed.secureToken",
      );
  }
  async addOutputAsync(output: SDBOutput): Promise<void> {
    return this.#connection("outputs").insert(output);
  }
  async updateOutputAsync(output: SDBOutput): Promise<void> {
    return this.#connection("outputs").where("id", output.id).update({
      name: output.name,
      model: output.model,
      address: output.address,
      color: output.color,
      pin: output.pin,
      isPwm: output.isPwm,
      isInvertedPwm: output.isInvertedPwm,
      automationTimeout: output.automationTimeout,
    });
  }
  async deleteOutputAsync(id: number): Promise<void> {
    return this.#connection("outputs").where("id", id).delete();
  }
  async addOutputStateAsync(output: {
    id: number;
    value: number;
    controlMode: ControlMode;
  }): Promise<void> {
    return this.#connection("output_data").insert({
      output_id: output.id,
      value: output.value,
      controlMode: output.controlMode,
      logTime: new Date().toISOString().slice(0, 19).replace("T", " "),
    });
  }
  async updateLastOutputStateAsync(output: {
    id: number;
    value: number;
    controlMode: ControlMode;
  }): Promise<void> {
    return this.#connection("outputs")
      .where("id", output.id)
      .update({
        lastValue: output.value,
        lastControlMode: output.controlMode,
        lastStateUpdate: new Date().toISOString().slice(0, 19).replace("T", " "),
      });
  }
  async getLastOutputStateAsync(outputId: number): Promise<SDBOutputState[]> {
    return this.#connection("outputs")
      .where("id", outputId)
      .select("lastControlMode as controlMode", "lastValue as value", "lastStateUpdate as logTime");
  }
  async getOutputStatesAsync(
    output: IOutputBase | { id: number },
    since: Date,
    minutes: number,
    toIsoString: boolean = false,
  ): Promise<SDBOutputState[]> {
    const states = await this.#connection("outputs as o")
      .join("output_data as d", "o.id", "d.output_id")
      .select("d.value", "d.controlMode", "d.logTime")
      .where(
        "d.logTime",
        ">",
        this.#connection.raw("DATE_SUB(?, INTERVAL ? MINUTE)", [since.toISOString(), minutes]),
      )
      .andWhere("d.output_id", output.id)
      .orderBy("d.logTime", "asc");

    if (toIsoString) {
      for (const state of states) {
        state.logTime = state.logTime.replace(" ", "T") + "Z";
      }
    }
    return states;
  }
  async getAutomationsAsync(): Promise<SDBAutomation[]> {
    return this.#connection("automations").select("*");
  }
  async getAutomationAsync(automationId: number): Promise<SDBAutomation[]> {
    return this.#connection("automations").where("id", automationId).select("*");
  }
  async addAutomationAsync(name: string, operator: AutomationOperator): Promise<number> {
    return (await this.#connection("automations").insert({ name: name, operator }))[0] ?? -1;
  }
  async updateAutomationAsync(
    name: string,
    operator: AutomationOperator,
    id: number,
  ): Promise<void> {
    return this.#connection("automations").where("id", id).update({ name, operator });
  }
  async deleteAutomationAsync(automationId: number): Promise<void> {
    return this.#connection("automations").where("id", automationId).delete();
  }
  async getOutputActionsAsync(): Promise<SDBOutputAction[]> {
    return this.#connection("output_actions").select([
      "id",
      "automation_id as automationId",
      "output_id as outputId",
      "value",
    ]);
  }
  async getOutputActionsByAutomationIdAsync(automationId: number): Promise<SDBOutputAction[]> {
    return this.#connection("output_actions")
      .where("automation_id", automationId)
      .select(["id", "automation_id as automationId", "output_id as outputId", "value"]);
  }
  async getOutputActionAsync(outputActionId: number): Promise<SDBOutputAction[]> {
    return this.#connection("output_actions")
      .where("id", outputActionId)
      .select(["id", "automation_id as automationId", "output_id as outputId", "value"]);
  }
  async addOutputActionAsync(
    automationId: number,
    outputId: number,
    value: number,
  ): Promise<number> {
    return (
      (
        await this.#connection("output_actions").insert({
          automation_id: automationId,
          output_id: outputId,
          value,
        })
      )[0] ?? -1
    );
  }
  async deleteOutputActionAsync(outputActionId: number): Promise<void> {
    return this.#connection("output_actions").where("id", outputActionId).delete();
  }
  async getAutomationsForOutputAsync(outputId: number): Promise<SDBOutputActionView[]> {
    return this.#connection("output_actions_view").where("outputId", outputId).select("*");
  }
  async getSensorConditionsAsync(automationId: number): Promise<SDBSensorCondition[]> {
    return this.#connection("sensor_conditions as sc")
      .select([
        "sc.id",
        "sc.automation_id as automationId",
        "sc.groupType",
        "sc.operator",
        "sc.comparisonValue",
        "sc.sensor_id as sensorId",
        "sc.readingType",
        "s.name as sensorName",
      ])
      .innerJoin("sensors as s", "sc.sensor_id", "s.id")
      .where("automation_id", automationId);
  }
  async addSensorConditionAsync(
    automationId: number,
    type: ConditionGroupType,
    operator: ConditionOperator,
    comparisonValue: number,
    sensorId: number,
    readingType: string,
  ): Promise<number> {
    return (
      (
        await this.#connection("sensor_conditions").insert({
          automation_id: automationId,
          groupType: type,
          operator,
          comparisonValue,
          sensor_id: sensorId,
          readingType,
        })
      )[0] ?? -1
    );
  }
  async updateSensorConditionAsync(
    automationId: number,
    condition: ISensorCondition,
  ): Promise<void> {
    return this.#connection("sensor_conditions")
      .where("automation_id", automationId)
      .and.where("id", condition.id)
      .update({
        groupType: condition.groupType,
        operator: condition.operator,
        comparisonValue: condition.comparisonValue,
        sensor_id: condition.sensorId,
        readingType: condition.readingType,
      });
  }
  async deleteSensorConditionAsync(conditionId: number): Promise<void> {
    return this.#connection("sensor_conditions").where("id", conditionId).delete();
  }
  async getOutputConditionsAsync(automationId: number): Promise<SDBOutputCondition[]> {
    return this.#connection("output_conditions as oc")
      .select([
        "oc.id",
        "oc.automation_id as automationId",
        "oc.groupType",
        "oc.operator",
        "oc.comparisonValue",
        "oc.output_id as outputId",
        "o.name as outputName",
      ])
      .innerJoin("outputs as o", "oc.output_id", "o.id")
      .where("automation_id", automationId);
  }
  async addOutputConditionAsync(
    automationId: number,
    type: ConditionGroupType,
    operator: ConditionOperator,
    comparisonValue: number,
    outputId: number,
  ): Promise<number> {
    return (
      (
        await this.#connection("output_conditions").insert({
          automation_id: automationId,
          groupType: type,
          operator,
          comparisonValue,
          output_id: outputId,
        })
      )[0] ?? -1
    );
  }
  async updateOutputConditionAsync(
    automationId: number,
    condition: IOutputCondition,
  ): Promise<void> {
    return this.#connection("output_conditions")
      .where("automation_id", automationId)
      .and.where("id", condition.id)
      .update({
        groupType: condition.groupType,
        operator: condition.operator,
        comparisonValue: condition.comparisonValue,
        output_id: condition.outputId,
      });
  }
  async deleteOutputConditionAsync(conditionId: number): Promise<void> {
    return this.#connection("output_conditions").where("id", conditionId).delete();
  }
  async getTimeConditionsAsync(automationId: number): Promise<SDBTimeCondition[]> {
    return this.#connection("time_conditions")
      .where("automation_id", automationId)
      .select(["id", "automation_id as automationId", "groupType", "startTime", "endTime"]);
  }
  async addTimeConditionAsync(
    automationId: number,
    type: ConditionGroupType,
    startTime: string | undefined | null,
    endTime: string | undefined | null,
  ): Promise<number> {
    return (
      (
        await this.#connection("time_conditions").insert({
          automation_id: automationId,
          groupType: type,
          startTime,
          endTime,
        })
      )[0] ?? -1
    );
  }
  async updateTimeConditionAsync(automationId: number, condition: ITimeCondition): Promise<void> {
    return this.#connection("time_conditions")
      .where("automation_id", automationId)
      .and.where("id", condition.id)
      .update({
        groupType: condition.groupType,
        startTime: condition.startTime,
        endTime: condition.endTime,
      });
  }
  async deleteTimeConditionAsync(conditionId: number): Promise<void> {
    return this.#connection("time_conditions").where("id", conditionId).delete();
  }
  async getWeekdayConditionsAsync(automationId: number): Promise<SDBWeekdayCondition[]> {
    return this.#connection("weekday_conditions")
      .where("automation_id", automationId)
      .select(["id", "automation_id as automationId", "groupType", "weekdays"]);
  }
  async addWeekdayConditionAsync(
    automationId: number,
    groupType: ConditionGroupType,
    weekdays: number,
  ): Promise<number> {
    return (
      (
        await this.#connection("weekday_conditions").insert({
          automation_id: automationId,
          groupType,
          weekdays,
        })
      )[0] ?? -1
    );
  }
  async updateWeekdayConditionAsync(
    automationId: number,
    condition: IWeekdayCondition,
  ): Promise<void> {
    return this.#connection("weekday_conditions")
      .where("automation_id", automationId)
      .and.where("id", condition.id)
      .update({
        groupType: condition.groupType,
        weekdays: condition.weekdays,
      });
  }
  async deleteWeekdayConditionAsync(conditionId: number): Promise<void> {
    return this.#connection("weekday_conditions").where("id", conditionId).delete();
  }

  async getCameraSettingsAsync(): Promise<SDBCameraSettings[]> {
    return this.#connection("camera_settings").select("*");
  }

  // async addCameraSettingsAsync(
  //   name: string,
  //   xVideoResolution: number | null,
  //   yVideoResolution: number | null,
  //   videoFps: number,
  //   xImageResolution: number | null,
  //   yImageResolution: number | null,
  //   imageRetentionDays: number,
  //   imageRetentionSize: number,
  //   timelapseEnabled: boolean,
  //   timelapseInterval: number | null,
  // ): Promise<number> {
  //   return (
  //     (
  //       await this.#connection("camera_settings").insert({
  //         name,
  //         xVideoResolution,
  //         yVideoResolution,
  //         videoFps,
  //         xImageResolution,
  //         yImageResolution,
  //         imageRetentionDays,
  //         imageRetentionSize,
  //         timelapseEnabled,
  //         timelapseInterval,
  //       })
  //     )[0] ?? -1
  //   );
  // }

  async updateCameraSettingsAsync(cameraSettings: SDBCameraSettings): Promise<void> {
    return this.#connection("camera_settings").where("id", cameraSettings.id).update({
      id: cameraSettings.id,
      enabled: cameraSettings.enabled,
      name: cameraSettings.name,
      xVideoResolution: cameraSettings.xVideoResolution,
      yVideoResolution: cameraSettings.yVideoResolution,
      videoFps: cameraSettings.videoFps,
      xImageResolution: cameraSettings.xImageResolution,
      yImageResolution: cameraSettings.yImageResolution,
      timelapseEnabled: cameraSettings.timelapseEnabled,
      imageRetentionDays: cameraSettings.imageRetentionDays,
      imageRetentionSize: cameraSettings.imageRetentionSize,
      timelapseInterval: cameraSettings.timelapseInterval,
      timelapseStartTime: cameraSettings.timelapseStartTime,
      timelapseEndTime: cameraSettings.timelapseEndTime,
    });
  }

  // async deleteCameraSettingsAsync(cameraId: number): Promise<void> {
  //   return this.#connection("camera_settings").where("id", cameraId).delete();
  // }

  async getUserAsync(username: string): Promise<SDBUser[]> {
    return this.#connection("users").where("username", username).select("*");
  }
  async addUserAsync(user: SDBUser): Promise<void> {
    return this.#connection("users").insert(user);
  }

  async getDatabaseSizeAsync(): Promise<number> {
    const result = await this.#connection.raw(
      "SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size FROM information_schema.tables WHERE table_schema = ?",
      [this.#connection.client.database()],
    );
    return parseFloat(result[0][0].size);
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.#connection.destroy();
  }
}
