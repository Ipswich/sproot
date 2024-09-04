import mysql2, { ResultSetHeader } from "mysql2/promise";

import { SDBUser } from "@sproot/sproot-common/dist/database/SDBUser";
import { SDBSensor } from "@sproot/sproot-common/dist/database/SDBSensor";
import { SDBOutput } from "@sproot/sproot-common/dist/database/SDBOutput";
import { ISprootDB } from "@sproot/sproot-common/src/database/ISprootDB";
import { ISensorBase } from "@sproot/sproot-common/dist/sensors/ISensorBase";
import { SDBReading } from "@sproot/sproot-common/dist/database/SDBReading";
import { SDBOutputState } from "@sproot/sproot-common/dist/database/SDBOutputState";
import { OutputBase } from "@sproot/sproot-server/src/outputs/base/OutputBase";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType";
import { ControlMode } from "@sproot/outputs/IOutputBase";
import { SDBAutomation } from "@sproot/database/SDBAutomation";
import { SDBOutputAutomationCondition } from "@sproot/database/SDBOutputAutomationCondition";
import { SDBSensorAutomationCondition } from "@sproot/database/SDBSensorAutomationCondition";
import { SDBTimeAutomationCondition } from "@sproot/database/SDBTimeAutomationCondition";
import { ConditionGroupType, ConditionOperator } from "@sproot/automation/ICondition";
import { AutomationOperator, IAutomation } from "@sproot/automation/IAutomation";
import { TimeCondition } from "../automation/conditions/TimeCondition";
import { OutputCondition } from "../automation/conditions/OutputCondition";
import { SensorCondition } from "../automation/conditions/SensorCondition";
class SprootDB implements ISprootDB {
  #connection: mysql2.Connection;

  constructor(connection: mysql2.Connection) {
    this.#connection = connection;
  }
  async getSensorAutomationConditionsAsync(
    automationId: number,
  ): Promise<SDBSensorAutomationCondition[]> {
    const [rows] = await this.#connection.execute<SDBSensorAutomationCondition[]>(
      "SELECT id, automation_id as automationId, type, operator, comparisonValue, sensor_id as sensorId, readingType FROM sensor_automation_conditions WHERE automation_id = ?",
      [automationId],
    );
    return rows;
  }
  async addSensorAutomationConditionAsync(
    automationId: number,
    type: ConditionGroupType,
    operator: ConditionOperator,
    comparisonValue: number,
    sensorId: number,
    readingType: string): Promise<number> {
    return (await this.#connection.execute<ResultSetHeader>(
      "INSERT INTO sensor_automation_conditions (automation_id, type, operator, comparisonValue, sensor_id, readingType) VALUES (?, ?, ?, ?, ?, ?)",
      [
        automationId,
        type,
        operator,
        comparisonValue,
        sensorId,
        readingType,
      ],
    ))[0].insertId;
  }
  async updateSensorAutomationConditionAsync(
    automationId: number,
    condition: SensorCondition,
  ): Promise<void> {
    await this.#connection.execute(
      "UPDATE sensor_automation_conditions SET type = ?, operator = ?, comparisonValue = ?, sensor_id = ?, readingType = ? WHERE automation_id = ? AND id = ?",
      [
        condition.group,
        condition.operator,
        condition.comparisonValue,
        condition.sensorId,
        condition.readingType,
        automationId,
        condition.id,
      ],
    );
  }
  async deleteSensorAutomationConditionAsync(conditionId: number): Promise<void> {
    await this.#connection.execute("DELETE FROM sensor_automation_conditions WHERE id = ?", [
      conditionId,
    ]);
  }

  async getOutputAutomationConditionsAsync(
    automationId: number,
  ): Promise<SDBOutputAutomationCondition[]> {
    const [rows] = await this.#connection.execute<SDBOutputAutomationCondition[]>(
      "SELECT id, automation_id as automationId, type, operator, comparisonValue, output_id as outputId FROM output_automation_conditions WHERE automation_id = ?",
      [automationId],
    );
    return rows;
  }
  async addOutputAutomationConditionAsync(
    automationId: number,
    type: ConditionGroupType,
    operator: ConditionOperator,
    comparisonValue: number,
    outputId: number): Promise<number> {
    return (await this.#connection.execute<ResultSetHeader>(
      "INSERT INTO output_automation_conditions (automation_id, type, operator, comparisonValue, output_id) VALUES (?, ?, ?, ?, ?)",
      [
        automationId,
        type,
        operator,
        comparisonValue,
        outputId,
      ],
    ))[0].insertId;
  }
  async updateOutputAutomationConditionAsync(
    automationId: number,
    condition: OutputCondition,
  ): Promise<void> {
    await this.#connection.execute(
      "UPDATE output_automation_conditions SET type = ?, operator = ?, comparisonValue = ?, output_id = ? WHERE automation_id = ? AND id = ?",
      [
        condition.group,
        condition.operator,
        condition.comparisonValue,
        condition.outputId,
        automationId,
        condition.id,
      ],
    );
  }
  async deleteOutputAutomationConditionAsync(conditionId: number): Promise<void> {
    await this.#connection.execute("DELETE FROM output_automation_conditions WHERE id = ?", [
      conditionId,
    ]);
  }
  
  async getTimeAutomationConditionsAsync(
    automationId: number,
  ): Promise<SDBTimeAutomationCondition[]> {
    const [rows] = await this.#connection.execute<SDBTimeAutomationCondition[]>(
      "SELECT id, automation_id as automationId, type, startTime, endTime FROM time_automation_conditions WHERE automation_id = ?",
      [automationId],
    );
    return rows;
  }
  async addTimeAutomationConditionAsync(
    automationId: number,
    type: ConditionGroupType,
    startTime: string | null,
    endTime: string | null
  ): Promise<number> {
    return (await this.#connection.execute<ResultSetHeader>(
      "INSERT INTO time_automation_conditions (automation_id, type, startTime, endTime) VALUES (?, ?, ?, ?)",
      [
        automationId,
        type,
        startTime,
        endTime
      ],
    ))[0].insertId;
  }
  async updateTimeAutomationConditionAsync(
    automationId: number,
    condition: TimeCondition,
  ): Promise<void> {
    await this.#connection.execute(
      "UPDATE time_automation_conditions SET type = ?, startTime = ?, endTime = ?, WHERE automation_id = ? AND id = ?",
      [
        condition.group,
        condition.startTime,
        condition.endTime,
        automationId,
        condition.id,
      ],
    );
  }
  async deleteTimeAutomationConditionAsync(conditionId: number): Promise<void> {
    await this.#connection.execute("DELETE FROM time_automation_conditions WHERE id = ?", [
      conditionId,
    ]);
  }

  async addAutomationAsync(name: string, outputId: number, value: number, operator: AutomationOperator): Promise<number> {
    const result = await this.#connection.execute<ResultSetHeader>(
      "INSERT INTO automations (name, output_id, value, operator) VALUES (?, ?, ?, ?)",
      [
        name,
        outputId,
        value,
        operator
      ],
    );
    return result[0].insertId;
  }

  async updateAutomationAsync(automation: IAutomation): Promise<void> {
    await this.#connection.execute(
      "UPDATE automations SET name = ?, value = ?, operator = ? WHERE id = ?",
      [
        automation.name,
        automation.value,
        automation.operator,
        automation.id,
      ],
    );
  }

  async deleteAutomationAsync(automationId: number): Promise<void> {
    await this.#connection.execute("DELETE FROM automations WHERE id = ?", [automationId]);
  }

  async getAutomationsAsync(outputId: number): Promise<SDBAutomation[]> {
    const [rows] = await this.#connection.execute<SDBAutomation[]>(
      "SELECT * FROM automations WHERE output_id = ?",
      [outputId],
    );
    return rows;
  }

  async getAutomationAsync(automationId: number): Promise<SDBAutomation[]> {
    const [rows] = await this.#connection.execute<SDBAutomation[]>(
      "SELECT * FROM automations WHERE id = ?",
      [automationId],
    );
    return rows;
  }

  async getSensorsAsync(): Promise<SDBSensor[]> {
    const [rows] = await this.#connection.execute<SDBSensor[]>("SELECT * FROM sensors");
    return rows;
  }

  async getSensorAsync(id: number): Promise<SDBSensor[]> {
    const [rows] = await this.#connection.execute<SDBSensor[]>(
      "SELECT * FROM sensors WHERE id = ?",
      [id],
    );
    return rows;
  }

  async getDS18B20AddressesAsync(): Promise<SDBSensor[]> {
    const [rows] = await this.#connection.execute<SDBSensor[]>(
      'SELECT address FROM sensors WHERE model = "DS18B20"',
    );
    return rows;
  }

  async addSensorAsync(sensor: SDBSensor): Promise<void> {
    await this.#connection.execute(
      "INSERT INTO sensors (name, model, address, color) VALUES (?, ?, ?, ?)",
      [sensor.name, sensor.model, sensor.address, sensor.color],
    );
  }

  async updateSensorAsync(sensor: SDBSensor): Promise<void> {
    await this.#connection.execute(
      "UPDATE sensors SET name = ?, model = ?, address = ?, color = ? WHERE id = ?",
      [sensor.name, sensor.model, sensor.address, sensor.color, sensor.id],
    );
  }

  async deleteSensorAsync(id: number): Promise<void> {
    await this.#connection.execute("DELETE FROM sensors WHERE id = ?", [id]);
  }

  async getOutputsAsync(): Promise<SDBOutput[]> {
    const [rows] = await this.#connection.execute<SDBOutput[]>("SELECT * FROM outputs");
    return rows;
  }

  async getOutputAsync(id: number): Promise<SDBOutput[]> {
    const [rows] = await this.#connection.execute<SDBOutput[]>(
      "SELECT * FROM outputs WHERE id = ?",
      [id],
    );
    return rows;
  }

  async addOutputAsync(output: SDBOutput): Promise<void> {
    await this.#connection.execute(
      "INSERT INTO outputs (name, model, address, color, pin, isPwm, isInvertedPwm) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        output.name,
        output.model,
        output.address,
        output.color,
        output.pin,
        output.isPwm,
        output.isInvertedPwm,
      ],
    );
  }

  async updateOutputAsync(output: SDBOutput): Promise<void> {
    await this.#connection.execute(
      "UPDATE outputs SET name = ?, model = ?, address = ?, color = ?, pin = ?, isPwm = ?, isInvertedPwm = ? WHERE id = ?",
      [
        output.name,
        output.model,
        output.address,
        output.color,
        output.pin,
        output.isPwm,
        output.isInvertedPwm,
        output.id,
      ],
    );
  }

  async deleteOutputAsync(id: number): Promise<void> {
    await this.#connection.execute("DELETE FROM outputs WHERE id = ?", [id]);
  }

  async addOutputStateAsync(output: {
    id: number;
    value: number;
    controlMode: ControlMode;
  }): Promise<void> {
    await this.#connection.execute(
      "INSERT INTO output_data (output_id, value, controlMode, logTime) VALUES (?, ?, ?, ?)",
      [
        output.id,
        output.value,
        output.controlMode,
        new Date().toISOString().slice(0, 19).replace("T", " "),
      ],
    );
  }

  async addSensorReadingAsync(sensor: ISensorBase): Promise<void> {
    for (const readingType in sensor.lastReading) {
      await this.#connection.execute(
        "INSERT INTO sensor_data (sensor_id, metric, data, units, logTime) VALUES (?, ?, ?, ?, ?)",
        [
          sensor.id,
          readingType,
          sensor.lastReading[readingType as ReadingType],
          sensor.units[readingType as ReadingType],
          sensor.lastReadingTime?.toISOString().slice(0, 19).replace("T", " "),
        ],
      );
    }
  }

  /**
   * Important note on this one:
   * The logTime is stored in the database in the format "YYYY-MM-DD HH:MM:SS". This is not a valid ISO string.
   * This function will convert the logTime to an ISO string if toIsoString is true. Otherwise, you should probably
   * this before you turn the returned date into a Date object as it'll be in a very different timezone and there'll
   * be some... Irregularities.
   * @param sensor sensor to fetch readings for.
   * @param since time at the start of the lookback period.
   * @param minutes minutes to lookback from since.
   * @param toIsoString whether to convert the logTime to an ISO string.
   * @returns An array of SDBOutputStates.
   */
  async getOutputStatesAsync(
    output: OutputBase | { id: number },
    since: Date,
    minutes: number = 120,
    toIsoString: boolean = false,
  ): Promise<SDBOutputState[]> {
    const [rows] = await this.#connection.execute<SDBOutputState[]>(
      `SELECT value, controlMode, logTime
      FROM outputs o
      JOIN (
        SELECT *
        FROM output_data
        WHERE logTime > DATE_SUB(?, INTERVAL ? MINUTE)
      ) AS d ON o.id=d.output_id
      WHERE output_id = ?
      ORDER BY logTime ASC`,
      [since.toISOString(), minutes, output.id],
    );
    if (toIsoString) {
      for (const row of rows) {
        row.logTime = row.logTime.replace(" ", "T") + "Z";
      }
    }
    return rows;
  }

  /**
   * Important note on this one:
   * The logTime is stored in the database in the format "YYYY-MM-DD HH:MM:SS". This is not a valid ISO string.
   * This function will convert the logTime to an ISO string if toIsoString is true. Otherwise, you should probably
   * this before you turn the returned date into a Date object as it'll be in a very different timezone and there'll
   * be some... Irregularities.
   * @param sensor sensor to fetch readings for.
   * @param since time at the start of the lookback period.
   * @param minutes minutes to lookback from since.
   * @param toIsoString whether to convert the logTime to an ISO string.
   * @returns An array of SDBReadings.
   */
  async getSensorReadingsAsync(
    sensor: ISensorBase | { id: number },
    since: Date,
    minutes: number = 120,
    toIsoString: boolean = false,
  ): Promise<SDBReading[]> {
    const [rows] = await this.#connection.execute<SDBReading[]>(
      `SELECT metric, data, units, logTime
      FROM sensors s
      JOIN (
        SELECT *
        FROM sensor_data
        WHERE logTime > DATE_SUB(?, INTERVAL ? MINUTE)
      ) AS d ON s.id=d.sensor_id
      WHERE sensor_id = ?
      ORDER BY logTime ASC`,
      [since.toISOString(), minutes, sensor.id],
    );
    if (toIsoString) {
      for (const row of rows) {
        row.logTime = row.logTime.replace(" ", "T") + "Z";
      }
    }
    return rows;
  }

  async getUserAsync(username: string): Promise<SDBUser[]> {
    const [rows] = await this.#connection.execute<SDBUser[]>(
      "SELECT * FROM users WHERE username = ?",
      [username],
    );
    return rows;
  }

  async addUserAsync(credentials: SDBUser): Promise<void> {
    await this.#connection.execute("INSERT INTO users (username, hash, email) VALUES (?, ?, ?)", [
      credentials.username,
      credentials.hash,
      credentials.email,
    ]);
  }

  async disposeAsync(): Promise<void> {
    await this.#connection.end();
  }
}

export { SprootDB };
