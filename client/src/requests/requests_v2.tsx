import { IOutputBase } from "@sproot/outputs/IOutputBase";
import { ISensorBase } from "@sproot/sensors/ISensorBase";
import { AutomationOperator, IAutomation } from "@sproot/automation/IAutomation";
import { SDBSensorCondition } from "@sproot/database/SDBSensorCondition";
import { SDBOutputCondition } from "@sproot/database/SDBOutputCondition";
import { SDBTimeCondition } from "@sproot/database/SDBTimeCondition";
import { SDBOutputAction } from "@sproot/database/SDBOutputAction";
import { ReadingType } from "@sproot/sensors/ReadingType";
import { SuccessResponse } from "@sproot/sproot-common/src/api/v2/Responses";
import {
  ChartSeries,
  DataSeries,
} from "@sproot/sproot-common/src/utility/ChartData";
import { ConditionGroupType, ConditionOperator } from "@sproot/automation/ConditionTypes";

const SERVER_URL = import.meta.env["VITE_API_SERVER_URL"];

export async function getReadingTypesAsync(): Promise<
  Record<ReadingType, string>
> {
  const response = await fetch(`${SERVER_URL}/api/v2/sensors/reading-types`, {
    method: "GET",
    headers: {},
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error fetching reading types: ${response}`);
  }
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}

export async function getSensorChartDataAsync(
  readingType?: string,
  latest?: boolean,
): Promise<{
  data: Partial<Record<ReadingType, DataSeries>>;
  series: ChartSeries[];
}> {
  const queryString = queryBuilder({
    readingType,
    latest,
  });
  const response = await fetch(
    `${SERVER_URL}/api/v2/sensors/chart-data?${queryString}`,
    {
      method: "GET",
      headers: {},
      mode: "cors",
      // credentials: "include",
    },
  );
  if (!response.ok) {
    console.error(`Error fetching sensor chart data: ${response}`);
  }
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}

export async function getOutputChartDataAsync(latest?: boolean): Promise<{
  data: DataSeries;
  series: ChartSeries[];
}> {
  const queryString = queryBuilder({
    latest,
  });
  const response = await fetch(
    `${SERVER_URL}/api/v2/outputs/chart-data?${queryString}`,
    {
      method: "GET",
      headers: {},
      mode: "cors",
      // credentials: "include",
    },
  );
  if (!response.ok) {
    console.error(`Error fetching output chart data: ${response}`);
  }
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}

export async function getSensorsAsync(): Promise<Record<string, ISensorBase>> {
  const response = await fetch(`${SERVER_URL}/api/v2/sensors`, {
    method: "GET",
    headers: {},
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error fetching sensors: ${response}`);
  }
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}

export async function getSupportedSensorModelsAsync(): Promise<string[]> {
  const response = await fetch(
    `${SERVER_URL}/api/v2/sensors/supported-models`,
    {
      method: "GET",
      headers: {},
      mode: "cors",
      // credentials: "include",
    },
  );
  if (!response.ok) {
    console.error(`Error fetching supported sensor models: ${response}`);
  }
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}

export async function addSensorAsync(sensor: ISensorBase): Promise<void> {
  const response = await fetch(`${SERVER_URL}/api/v2/sensors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sensor),
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error adding sensor: ${response}`);
  }
}

export async function updateSensorAsync(sensor: ISensorBase): Promise<void> {
  const response = await fetch(`${SERVER_URL}/api/v2/sensors/${sensor.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sensor),
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error updating sensor: ${response}`);
  }
}

export async function deleteSensorAsync(id: number): Promise<void> {
  const response = await fetch(`${SERVER_URL}/api/v2/sensors/${id}`, {
    method: "DELETE",
    headers: {},
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error deleting sensor: ${response}`);
  }
}

export async function getOutputsAsync(): Promise<Record<string, IOutputBase>> {
  const response = await fetch(`${SERVER_URL}/api/v2/outputs`, {
    method: "GET",
    headers: {},
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error fetching outputs: ${response}`);
  }
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}


// export async function getAutomationsByOutputIdAsync(id: number): Promise<Record<string, IOutputBase>> {
//   const response = await fetch(`${SERVER_URL}/api/v2/automations/${id}`, {
//     method: "GET",
//     headers: {},
//     mode: "cors",
//     // credentials: "include",
//   });
//   if (!response.ok) {
//     console.error(`Error fetching automations: ${response}`);
//   }
//   const deserializedResponse = (await response.json()) as SuccessResponse;
//   return deserializedResponse.content?.data;
// }

export async function getAutomationsAsync(): Promise<IAutomation[]> {
  const response = await fetch(`${SERVER_URL}/api/v2/automations`, {
    method: "GET",
    headers: {},
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error fetching automations: ${response}`);
  }
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}

export async function addAutomationAsync(name: string, operator: AutomationOperator): Promise<IAutomation> {
  const response = await fetch(`${SERVER_URL}/api/v2/automations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    mode: "cors",
    body: JSON.stringify({ name, operator }),
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error adding automation: ${response}`);
  }
  return (await response.json()).content.data;
}

export async function updateAutomationAsync(id: number, name: string, operator: AutomationOperator): Promise<void> {
  const response = await fetch(`${SERVER_URL}/api/v2/automations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    mode: "cors",
    body: JSON.stringify({ name, operator }),
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error updating automation: ${response}`);
  }
}

export async function deleteAutomationAsync(id: number): Promise<void> {
  const response = await fetch(`${SERVER_URL}/api/v2/automations/${id}`, {
    method: "DELETE",
    headers: {},
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error deleting automation: ${response}`);
  }
}

export async function getConditionsAsync(automationId: number): Promise<{
  sensor: { allOf: SDBSensorCondition[], anyOf: SDBSensorCondition[], oneOf: SDBSensorCondition[] },
  output: { allOf: SDBOutputCondition[], anyOf: SDBOutputCondition[], oneOf: SDBOutputCondition[] },
  time: { allOf: SDBTimeCondition[], anyOf: SDBTimeCondition[], oneOf: SDBTimeCondition[] }
}> {
  const response = await fetch(`${SERVER_URL}/api/v2/automations/${automationId}/conditions`, {
    method: "GET",
    headers: {},
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error fetching sensor conditions: ${response}`);
  }
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}

export async function addSensorConditionAsync(automationId: number, groupType: ConditionGroupType, operator: ConditionOperator, comparisonValue: number, sensorId: string, readingType: ReadingType): Promise<void> {
  const response = await fetch(`${SERVER_URL}/api/v2/automations/${automationId}/conditions/sensor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ groupType, operator, comparisonValue, sensorId, readingType }),
    mode: "cors",
    // credentials: "include",
  });
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}

export async function deleteSensorConditionAsync(automationId: number, id: number): Promise<void> {
  const response = await fetch(`${SERVER_URL}/api/v2/automations/${automationId}/conditions/sensor/${id}`, {
    method: "DELETE",
    headers: {},
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error deleting sensor condition: ${response}`);
  }
}

export async function addOutputConditionAsync(automationId: number, groupType: ConditionGroupType, operator: ConditionOperator, comparisonValue: number, outputId: string): Promise<void> {
  const response = await fetch(`${SERVER_URL}/api/v2/automations/${automationId}/conditions/output`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ groupType, operator, comparisonValue, outputId }),
    mode: "cors",
    // credentials: "include",
  });
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}

export async function deleteOutputConditionAsync(automationId: number, id: number): Promise<void> {
  const response = await fetch(`${SERVER_URL}/api/v2/automations/${automationId}/conditions/output/${id}`, {
    method: "DELETE",
    headers: {},
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error deleting output condition: ${response}`);
  }
}

export async function addTimeConditionAsync(automationId: number, groupType: ConditionGroupType, startTime: string | null, endTime: string | null): Promise<void> {
  const response = await fetch(`${SERVER_URL}/api/v2/automations/${automationId}/conditions/time`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ groupType, startTime, endTime }),
    mode: "cors",
    // credentials: "include",
  });
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}

export async function deleteTimeConditionAsync(automationId: number, id: number): Promise<void> {
  const response = await fetch(`${SERVER_URL}/api/v2/automations/${automationId}/conditions/time/${id}`, {
    method: "DELETE",
    headers: {},
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error deleting time condition: ${response}`);
  }
}

export async function getOutputActionsByAutomationIdAsync(automationId: number): Promise<SDBOutputAction[]> {
  const response = await fetch(`${SERVER_URL}/api/v2/output-actions?automationId=${automationId}`, {
    method: "GET",
    headers: {},
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error fetching output actions: ${response}`);
  }
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}

export async function addOutputActionAsync(automationId: number, outputId: number, value: number) {
  const response = await fetch(`${SERVER_URL}/api/v2/output-actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ automationId, outputId, value }),
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error adding output action: ${response}`);
  }
}

export async function deleteOutputActionAsync(id: number): Promise<void> {
  const response = await fetch(`${SERVER_URL}/api/v2/output-actions/${id}`, {
    method: "DELETE",
    headers: {},
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error deleting output action: ${response}`);
  }
}

export async function getSupportedOutputModelsAsync(): Promise<string[]> {
  const response = await fetch(
    `${SERVER_URL}/api/v2/outputs/supported-models`,
    {
      method: "GET",
      headers: {},
      mode: "cors",
      // credentials: "include",
    },
  );
  if (!response.ok) {
    console.error(`Error fetching supported output models: ${response}`);
  }
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}

export async function addOutputAsync(output: IOutputBase): Promise<void> {
  const response = await fetch(`${SERVER_URL}/api/v2/outputs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(output),
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error adding output: ${response}`);
  }
}

export async function updateOutputAsync(output: IOutputBase): Promise<void> {
  const response = await fetch(`${SERVER_URL}/api/v2/outputs/${output.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(output),
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error updating output: ${response}`);
  }
}

export async function deleteOutputAsync(id: number): Promise<void> {
  const response = await fetch(`${SERVER_URL}/api/v2/outputs/${id}`, {
    method: "DELETE",
    headers: {},
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error deleting output: ${response}`);
  }
}

export async function setOutputControlModeAsync(
  id: number,
  controlMode: string = "manual",
): Promise<void> {
  const response = await fetch(
    `${SERVER_URL}/api/v2/outputs/${id}/control-mode`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ controlMode }),
      mode: "cors",
      // credentials: "include",
    },
  );
  if (!response.ok) {
    console.error(`Error setting control mode: ${response}`);
  }
}

export async function setOutputManualStateAsync(
  id: number,
  value: number,
): Promise<void> {
  const response = await fetch(
    `${SERVER_URL}/api/v2/outputs/${id}/manual-state`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
      mode: "cors",
      // credentials: "include",
    },
  );
  if (!response.ok) {
    console.error(`Error setting manual state: ${response}`);
  }
}

function queryBuilder(
  params: Record<string, string | boolean | undefined>,
): string {
  return (
    Object.entries(params)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `${key}=${value}`)
      .join("&")
  );
}
