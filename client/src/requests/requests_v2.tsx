import { IOutputBase } from "@sproot/outputs/IOutputBase";
import { ISensorBase } from "@sproot/sensors/ISensorBase";
import {
  AutomationOperator,
  IAutomation,
} from "@sproot/automation/IAutomation";
import { SDBSubcontroller } from "@sproot/database/SDBSubcontroller";
import { SDBSensorCondition } from "@sproot/database/SDBSensorCondition";
import { SDBOutputCondition } from "@sproot/database/SDBOutputCondition";
import { SDBTimeCondition } from "@sproot/database/SDBTimeCondition";
import { SDBWeekdayCondition } from "@sproot/database/SDBWeekdayCondition";
import { SDBOutputAction } from "@sproot/database/SDBOutputAction";
import { SDBCameraSettings } from "@sproot/database/SDBCameraSettings";
import { SDBDeviceZone } from "@sproot/database/SDBDeviceZone";
import { AvailableDevice } from "@sproot/outputs/AvailableDevice";
import { ReadingType } from "@sproot/sensors/ReadingType";
import { SystemStatus } from "@sproot/system/SystemStatus";
import {
  SuccessResponse,
  ErrorResponse,
} from "@sproot/sproot-common/src/api/v2/Responses";
import {
  ChartSeries,
  DataSeries,
} from "@sproot/sproot-common/src/utility/ChartData";
import {
  ConditionGroupType,
  ConditionOperator,
} from "@sproot/automation/ConditionTypes";
import { SDBMonthCondition } from "@sproot/database/SDBMonthCondition";
import { SDBDateRangeCondition } from "@sproot/database/SDBDateRangeCondition";

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

export async function getSupportedSensorModelsAsync(): Promise<
  Record<string, string>
> {
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

export async function getDeviceZonesAsync(): Promise<SDBDeviceZone[]> {
  const response = await fetch(`${SERVER_URL}/api/v2/device-zones`, {
    method: "GET",
    headers: {},
    mode: "cors",
    // credentials: "include",
  });

  if (!response.ok) {
    console.error(`Error fetching device zones: ${response}`);
    return [];
  }
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}

export async function addDeviceZoneAsync(name: string): Promise<void> {
  const response = await fetch(`${SERVER_URL}/api/v2/device-zones`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error adding device zone: ${response}`);
  }
}

export async function updateDeviceZoneAsync(
  group: SDBDeviceZone,
): Promise<void> {
  const response = await fetch(
    `${SERVER_URL}/api/v2/device-zones/${group.id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: group.name }),
      mode: "cors",
      // credentials: "include",
    },
  );
  if (!response.ok) {
    console.error(`Error updating device zone: ${response}`);
  }
}

export async function deleteDeviceZoneAsync(id: number): Promise<void> {
  const response = await fetch(`${SERVER_URL}/api/v2/device-zones/${id}`, {
    method: "DELETE",
    headers: {},
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error deleting device zone: ${response}`);
  }
}

export async function getAutomationsAsync(): Promise<IAutomation[]> {
  const response = await fetch(`${SERVER_URL}/api/v2/automations`, {
    method: "GET",
    headers: {},
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error fetching automations: ${response}`);
    return [];
  }
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}

export async function addAutomationAsync(
  name: string,
  operator: AutomationOperator,
): Promise<IAutomation> {
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

export async function updateAutomationAsync(
  id: number,
  name?: string,
  operator?: AutomationOperator,
  enabled?: boolean,
): Promise<void> {
  const response = await fetch(`${SERVER_URL}/api/v2/automations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    mode: "cors",
    body: JSON.stringify({ name, operator, enabled }),
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
  sensor: {
    allOf: SDBSensorCondition[];
    anyOf: SDBSensorCondition[];
    oneOf: SDBSensorCondition[];
  };
  output: {
    allOf: SDBOutputCondition[];
    anyOf: SDBOutputCondition[];
    oneOf: SDBOutputCondition[];
  };
  time: {
    allOf: SDBTimeCondition[];
    anyOf: SDBTimeCondition[];
    oneOf: SDBTimeCondition[];
  };
  weekday: {
    allOf: SDBWeekdayCondition[];
    anyOf: SDBWeekdayCondition[];
    oneOf: SDBWeekdayCondition[];
  };
  month: {
    allOf: SDBMonthCondition[];
    anyOf: SDBMonthCondition[];
    oneOf: SDBMonthCondition[];
  };
  dateRange: {
    allOf: SDBDateRangeCondition[];
    anyOf: SDBDateRangeCondition[];
    oneOf: SDBDateRangeCondition[];
  };
}> {
  const response = await fetch(
    `${SERVER_URL}/api/v2/automations/${automationId}/conditions`,
    {
      method: "GET",
      headers: {},
      mode: "cors",
      // credentials: "include",
    },
  );
  if (!response.ok) {
    console.error(`Error fetching sensor conditions: ${response}`);
  }
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}

export async function addSensorConditionAsync(
  automationId: number,
  groupType: ConditionGroupType,
  operator: ConditionOperator,
  comparisonValue: number,
  comparisonLookback: number | null,
  sensorId: string,
  readingType: ReadingType,
): Promise<void> {
  const response = await fetch(
    `${SERVER_URL}/api/v2/automations/${automationId}/conditions/sensor`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupType,
        operator,
        comparisonValue,
        comparisonLookback,
        sensorId,
        readingType,
      }),
      mode: "cors",
      // credentials: "include",
    },
  );
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}

export async function deleteSensorConditionAsync(
  automationId: number,
  id: number,
): Promise<void> {
  const response = await fetch(
    `${SERVER_URL}/api/v2/automations/${automationId}/conditions/sensor/${id}`,
    {
      method: "DELETE",
      headers: {},
      mode: "cors",
      // credentials: "include",
    },
  );
  if (!response.ok) {
    console.error(`Error deleting sensor condition: ${response}`);
  }
}

export async function addOutputConditionAsync(
  automationId: number,
  groupType: ConditionGroupType,
  operator: ConditionOperator,
  comparisonValue: number,
  comparisonLookback: number | null,
  outputId: string,
): Promise<void> {
  const response = await fetch(
    `${SERVER_URL}/api/v2/automations/${automationId}/conditions/output`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupType,
        operator,
        comparisonValue,
        comparisonLookback,
        outputId,
      }),
      mode: "cors",
      // credentials: "include",
    },
  );
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}

export async function deleteOutputConditionAsync(
  automationId: number,
  id: number,
): Promise<void> {
  const response = await fetch(
    `${SERVER_URL}/api/v2/automations/${automationId}/conditions/output/${id}`,
    {
      method: "DELETE",
      headers: {},
      mode: "cors",
      // credentials: "include",
    },
  );
  if (!response.ok) {
    console.error(`Error deleting output condition: ${response}`);
  }
}

export async function addTimeConditionAsync(
  automationId: number,
  groupType: ConditionGroupType,
  startTime: string | null,
  endTime: string | null,
): Promise<void> {
  const response = await fetch(
    `${SERVER_URL}/api/v2/automations/${automationId}/conditions/time`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupType, startTime, endTime }),
      mode: "cors",
      // credentials: "include",
    },
  );
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}

export async function deleteTimeConditionAsync(
  automationId: number,
  id: number,
): Promise<void> {
  const response = await fetch(
    `${SERVER_URL}/api/v2/automations/${automationId}/conditions/time/${id}`,
    {
      method: "DELETE",
      headers: {},
      mode: "cors",
      // credentials: "include",
    },
  );
  if (!response.ok) {
    console.error(`Error deleting time condition: ${response}`);
  }
}

export async function addWeekdayConditionAsync(
  automationId: number,
  groupType: ConditionGroupType,
  weekdays: number,
): Promise<void> {
  const response = await fetch(
    `${SERVER_URL}/api/v2/automations/${automationId}/conditions/weekday`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupType, weekdays }),
      mode: "cors",
      // credentials: "include",
    },
  );
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}

export async function deleteWeekdayConditionAsync(
  automationId: number,
  id: number,
): Promise<void> {
  const response = await fetch(
    `${SERVER_URL}/api/v2/automations/${automationId}/conditions/weekday/${id}`,
    {
      method: "DELETE",
      headers: {},
      mode: "cors",
      // credentials: "include",
    },
  );
  if (!response.ok) {
    console.error(`Error deleting weekday condition: ${response}`);
  }
}

export async function addMonthConditionAsync(
  automationId: number,
  groupType: ConditionGroupType,
  months: number,
): Promise<void> {
  const response = await fetch(
    `${SERVER_URL}/api/v2/automations/${automationId}/conditions/month`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupType, months }),
      mode: "cors",
      // credentials: "include",
    },
  );
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}

export async function deleteMonthConditionAsync(
  automationId: number,
  id: number,
): Promise<void> {
  const response = await fetch(
    `${SERVER_URL}/api/v2/automations/${automationId}/conditions/month/${id}`,
    {
      method: "DELETE",
      headers: {},
      mode: "cors",
      // credentials: "include",
    },
  );
  if (!response.ok) {
    console.error(`Error deleting month condition: ${response}`);
  }
}

export async function addDateRangeConditionAsync(
  automationId: number,
  groupType: ConditionGroupType,
  startMonth: number,
  startDate: number,
  endMonth: number,
  endDate: number,
): Promise<void> {
  const response = await fetch(
    `${SERVER_URL}/api/v2/automations/${automationId}/conditions/date-range`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupType,
        startMonth,
        startDate,
        endMonth,
        endDate,
      }),
      mode: "cors",
      // credentials: "include",
    },
  );
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}

export async function deleteDateRangeConditionAsync(
  automationId: number,
  id: number,
): Promise<void> {
  const response = await fetch(
    `${SERVER_URL}/api/v2/automations/${automationId}/conditions/date-range/${id}`,
    {
      method: "DELETE",
      headers: {},
      mode: "cors",
      // credentials: "include",
    },
  );
  if (!response.ok) {
    console.error(`Error deleting month condition: ${response}`);
  }
}

export async function getOutputActionsByAutomationIdAsync(
  automationId: number,
): Promise<SDBOutputAction[]> {
  const response = await fetch(
    `${SERVER_URL}/api/v2/output-actions?automationId=${automationId}`,
    {
      method: "GET",
      headers: {},
      mode: "cors",
      // credentials: "include",
    },
  );
  if (!response.ok) {
    console.error(`Error fetching output actions: ${response}`);
  }
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}

export async function addOutputActionAsync(
  automationId: number,
  outputId: number,
  value: number,
) {
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

export async function getSupportedOutputModelsAsync(): Promise<
  Record<string, string>
> {
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

export async function addOutputAsync(
  output: IOutputBase,
): Promise<IOutputBase | undefined> {
  const response = await fetch(`${SERVER_URL}/api/v2/outputs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(output),
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error adding output: ${response}`);
    return;
  }
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data as IOutputBase | undefined;
}

export async function updateOutputAsync(
  output: IOutputBase,
): Promise<IOutputBase | undefined> {
  const response = await fetch(`${SERVER_URL}/api/v2/outputs/${output.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(output),
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error updating output: ${response}`);
    return;
  }
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data as IOutputBase | undefined;
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

export async function powerOffAsync(): Promise<void> {
  const response = await fetch(`${SERVER_URL}/api/v2/system/power-off`, {
    method: "POST",
    headers: {},
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error powering off: ${response}`);
  }
}

export async function pingAsync(): Promise<boolean> {
  try {
    const response = await fetch(`${SERVER_URL}/api/v2/ping`, {
      method: "GET",
      headers: {},
      mode: "cors",
      // credentials: "include",
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function getAvailableDevicesAsync(
  model: string,
  address?: string,
  filterUsed = true,
): Promise<AvailableDevice[]> {
  const queryString = queryBuilder({ address, filterUsed });
  try {
    const response = await fetch(
      `${SERVER_URL}/api/v2/outputs/available-devices/${model}/?${queryString}`,
      {
        method: "GET",
        headers: {},
        mode: "cors",
        // credentials: "include",
      },
    );
    const deserializedResponse = (await response.json()) as SuccessResponse;
    return deserializedResponse.content?.data;
  } catch (e) {
    console.error(`Error fetching children for ${model}: ${e}`);
    return [];
  }
}

export async function getLatestImageAsync() {
  try {
    const response = await fetch(`${SERVER_URL}/api/v2/camera/latest-image`, {
      method: "GET",
      headers: {},
      mode: "cors",
      // credentials: "include",
    });
    if (response.ok) {
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    }
    return (await response.json()) as ErrorResponse;
  } catch (e) {
    console.error(`Error fetching latest image: ${e}`);
    return;
  }
}

export async function getTimelapseArchiveAsync() {
  try {
    // Create a new window/tab for the download
    // This will use the browser's native download handling
    const downloadUrl = `${SERVER_URL}/api/v2/camera/timelapse/archive`;

    // Open in a hidden iframe to prevent opening a new tab
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    // Set the source to the download URL
    iframe.src = downloadUrl;

    // Clean up after a short delay to ensure download starts
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 5000);

    return { success: true };
  } catch (e) {
    console.error(`Error downloading timelapse archive:`, e);
    throw e;
  }
}

export async function getTimelapseArchiveStatusAsync(): Promise<{
  isGenerating: boolean;
  archiveProgress: number;
}> {
  const response = await fetch(
    `${SERVER_URL}/api/v2/camera/timelapse/archive/status`,
    {
      method: "GET",
      headers: {},
      mode: "cors",
      // credentials: "include",
    },
  );
  if (!response.ok) {
    console.error(`Error fetching timelapse archive status: ${response}`);
  }
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}

export async function regenerateTimelapseArchiveAsync(): Promise<void> {
  const response = await fetch(
    `${SERVER_URL}/api/v2/camera/timelapse/archive/regenerate`,
    {
      method: "POST",
      headers: {},
      mode: "cors",
      // credentials: "include",
    },
  );
  if (!response.ok) {
    console.error(`Error regenerating timelapse archive: ${response}`);
  }
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}

export async function getLivestreamAsync() {
  return `${SERVER_URL}/api/v2/camera/stream`;
}

export async function getCameraSettingsAsync(): Promise<SDBCameraSettings> {
  const response = await fetch(`${SERVER_URL}/api/v2/camera/settings`, {
    method: "GET",
    headers: {},
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error fetching camera settings: ${response}`);
  }
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}

export async function updateCameraSettingsAsync(
  settings: SDBCameraSettings,
): Promise<void> {
  settings.videoFps = null;
  settings.xImageResolution = null;
  settings.yImageResolution = null;
  settings.xVideoResolution = null;
  settings.yVideoResolution = null;

  const response = await fetch(`${SERVER_URL}/api/v2/camera/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error updating camera settings: ${response}`);
  }
}

export async function getSystemStatusAsync(): Promise<SystemStatus> {
  const response = await fetch(`${SERVER_URL}/api/v2/system/status`, {
    method: "GET",
    headers: {},
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error fetching camera settings: ${response}`);
  }
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}

export async function getSubcontrollerAsync(): Promise<{
  recognized: SDBSubcontroller[];
  unrecognized: {
    name: string;
    hostName: string;
    address: string | string[];
  }[];
}> {
  const response = await fetch(`${SERVER_URL}/api/v2/subcontrollers`, {
    method: "GET",
    headers: {},
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error fetching subcontrollers: ${response}`);
  }
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}

export async function getBackupsListAsync(): Promise<string[]> {
  const response = await fetch(`${SERVER_URL}/api/v2/system/backups`, {
    method: "GET",
    headers: {},
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error fetching backups list: ${response}`);
  }
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}

export async function downloadBackupAsync(
  fileName: string,
): Promise<{ success: boolean }> {
  const downloadUrl = `${SERVER_URL}/api/v2/system/backups/download/${fileName}`;
  try {
    // Open in a hidden iframe to prevent opening a new tab
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    // Set the source to the download URL
    iframe.src = downloadUrl;

    // Clean up after a short delay to ensure download starts
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 5000);

    return { success: true };
  } catch (e) {
    console.error(`Error downloading timelapse archive:`, e);
    throw e;
  }
}

export async function uploadAndRestoreBackupAsync(
  file: File,
): Promise<SuccessResponse | ErrorResponse> {
  const response = await fetch(`${SERVER_URL}/api/v2/system/backups/restore`, {
    method: "POST",
    body: file,
    headers: {
      "Content-Type": "application/octet-stream",
    },
    mode: "cors",
    // credentials: "include",
  });
  const json = await response.json();
  if (!response.ok) {
    console.error(`Error uploading and restoring backup: ${response}`);
    return json as ErrorResponse;
  }
  return json as SuccessResponse;
}

export async function createBackupAsync(): Promise<void> {
  const response = await fetch(`${SERVER_URL}/api/v2/system/backups/create`, {
    method: "POST",
    headers: {},
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error creating backup: ${response}`);
  }
  const result = (await response.json()) as SuccessResponse;
  return result.content?.data;
}

export async function getBackupCreationStatusAsync(): Promise<{
  isGeneratingBackup: boolean;
}> {
  const response = await fetch(
    `${SERVER_URL}/api/v2/system/backups/create/status`,
    {
      method: "GET",
      headers: {},
      mode: "cors",
      // credentials: "include",
    },
  );
  if (!response.ok) {
    console.error(`Error fetching backup creation status: ${response}`);
  }
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}

export async function getSubcontrollerConnectionStatusAsync(
  id: number,
): Promise<{ online: boolean; version?: string }> {
  const response = await fetch(
    `${SERVER_URL}/api/v2/subcontrollers/${id}/connection-status`,
    {
      method: "GET",
      headers: {},
      mode: "cors",
      // credentials: "include",
    },
  );
  if (!response.ok) {
    console.error(`Error fetching subcontrollers: ${response}`);
  }
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}

export async function addSubcontrollerAsync(device: {
  name: string;
  hostName: string;
}): Promise<void> {
  const response = await fetch(`${SERVER_URL}/api/v2/subcontrollers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(device),
    mode: "cors",
    // credentials: "include",
  });

  if (!response.ok) {
    console.error(`Error adding subcontroller ${device.hostName}: ${response}`);
  }
}

export async function updateSubcontrollerAsync(device: {
  id: number;
  name: string;
}): Promise<void> {
  const response = await fetch(
    `${SERVER_URL}/api/v2/subcontrollers/${device.id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(device),
      mode: "cors",
      // credentials: "include",
    },
  );
  if (!response.ok) {
    console.error(`Error updating subcontroller: ${response}`);
  }
}

export async function getFirmwareManifestAsync(): Promise<{
  version: string;
  path: string;
  sha256: string;
}> {
  const response = await fetch(
    `${SERVER_URL}/api/v2/subcontrollers/firmware/esp32/manifest`,
    {
      method: "GET",
      headers: {},
      mode: "cors",
      // credentials: "include",
    },
  );
  if (!response.ok) {
    console.error(
      `Error fetching subcontroller firmware manifest: ${response}`,
    );
  }
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return deserializedResponse.content?.data;
}

export async function triggerSubcontrollerFirmwareUpdateAsync(
  id: number,
): Promise<{ status: number; message: string }> {
  const response = await fetch(
    `${SERVER_URL}/api/v2/subcontrollers/firmware/esp32/ota-update/${id}`,
    {
      method: "POST",
      headers: {},
      mode: "cors",
      // credentials: "include",
    },
  );
  if (!response.ok) {
    console.error(
      `Error triggering subcontroller firmware update: ${response}`,
    );
    const deserializedResponse = (await response.json()) as ErrorResponse;
    return {
      status: response.status,
      message: deserializedResponse.error.details[0]!,
    };
  }
  const deserializedResponse = (await response.json()) as SuccessResponse;
  return {
    status: response.status,
    message: deserializedResponse.content?.data?.message,
  };
}

export async function deleteSubcontrollerAsync(id: number): Promise<void> {
  const response = await fetch(`${SERVER_URL}/api/v2/subcontrollers/${id}`, {
    method: "DELETE",
    headers: {},
    mode: "cors",
    // credentials: "include",
  });
  if (!response.ok) {
    console.error(`Error deleting subcontroller: ${response}`);
  }
}

export async function getSubcontrollerManifestAsync(model: string) {
  let response: Response;
  try {
    switch (model.toLowerCase()) {
      case "esp32":
        response = await fetch(
          `${SERVER_URL}/api/v2/subcontrollers/firmware/esp32/manifest`,
          {
            method: "GET",
            headers: {},
            mode: "cors",
            // credentials: "include",
          },
        );
        break;
      default:
        throw new Error(`Unsupported subcontroller model: ${model}`);
    }

    if (!response.ok) {
      throw new Error(
        `Error fetching esp32 manifest: ${response.status} ${response.statusText}`,
      );
    }
  } catch (e) {
    console.error(`Error fetching esp32 manifest:`, e);
    throw e;
  }

  return (await response.json()).content.data as Record<
    "version" | "sha256" | "path",
    string
  >;
}

export async function getSubcontrollerBinaryAsync(model: string) {
  let response: Response;
  try {
    switch (model.toLowerCase()) {
      case "esp32":
        response = await fetch(
          `${SERVER_URL}/api/v2/subcontrollers/firmware/esp32/binary`,
          {
            method: "GET",
            headers: {},
            mode: "cors",
            // credentials: "include",
          },
        );
        break;
      default:
        throw new Error(`Unsupported subcontroller model: ${model}`);
    }

    if (!response.ok) {
      throw new Error(
        `Error fetching esp32 binary: ${response.status} ${response.statusText}`,
      );
    }
  } catch (e) {
    console.error(`Error fetching esp32 binary:`, e);
    throw e;
  }

  return new Uint8Array(await response.arrayBuffer());
}

export async function getSubControllerBootloaderAsync(model: string) {
  let response: Response;
  try {
    switch (model.toLowerCase()) {
      case "esp32":
        response = await fetch(
          `${SERVER_URL}/api/v2/subcontrollers/firmware/esp32/bootloader`,
          {
            method: "GET",
            headers: {},
            mode: "cors",
            // credentials: "include",
          },
        );
        break;
      default:
        throw new Error(`Unsupported subcontroller model: ${model}`);
    }

    if (!response.ok) {
      throw new Error(
        `Error fetching esp32 bootloader: ${response.status} ${response.statusText}`,
      );
    }
  } catch (e) {
    console.error(`Error fetching esp32 bootloader:`, e);
    throw e;
  }

  return new Uint8Array(await response.arrayBuffer());
}

export async function getSubControllerPartitionsAsync(model: string) {
  let response: Response;
  try {
    switch (model.toLowerCase()) {
      case "esp32":
        response = await fetch(
          `${SERVER_URL}/api/v2/subcontrollers/firmware/esp32/partitions`,
          {
            method: "GET",
            headers: {},
            mode: "cors",
            // credentials: "include",
          },
        );
        break;
      default:
        throw new Error(`Unsupported subcontroller model: ${model}`);
    }

    if (!response.ok) {
      throw new Error(
        `Error fetching esp32 partitions: ${response.status} ${response.statusText}`,
      );
    }
  } catch (e) {
    console.error(`Error fetching esp32 partitions:`, e);
    throw e;
  }

  return new Uint8Array(await response.arrayBuffer());
}

export async function getSubControllerApplicationAsync(model: string) {
  let response: Response;
  try {
    switch (model.toLowerCase()) {
      case "esp32":
        response = await fetch(
          `${SERVER_URL}/api/v2/subcontrollers/firmware/esp32/application`,
          {
            method: "GET",
            headers: {},
            mode: "cors",
            // credentials: "include",
          },
        );
        break;
      default:
        throw new Error(`Unsupported subcontroller model: ${model}`);
    }

    if (!response.ok) {
      throw new Error(
        `Error fetching esp32 application: ${response.status} ${response.statusText}`,
      );
    }
  } catch (e) {
    console.error(`Error fetching esp32 application:`, e);
    throw e;
  }

  return new Uint8Array(await response.arrayBuffer());
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
