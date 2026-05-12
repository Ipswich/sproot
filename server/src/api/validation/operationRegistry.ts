import type { ZodiosEndpointDefinition } from "@zodios/core";
import {
  auth,
  automations,
  camera,
  deviceZones,
  generatedApiContractManifest,
  journals,
  outputs,
  ping,
  sensors,
  subcontrollers,
  system,
  tags,
} from "@sproot/sproot-common/dist/api/generated";
import type {
  ContractDomainExportName,
  ContractManifestDomainEntry,
  ContractOperationId,
} from "@sproot/sproot-common/dist/api/contracts/operation-types";
import { z } from "zod";

type OperationParameterSource = "body" | "path" | "query" | "header";

export type OperationParameterSchema = {
  name: string;
  schema: z.ZodTypeAny;
};

export type OperationContract = {
  operationId: ContractOperationId;
  domain: ContractManifestDomainEntry;
  endpoint: ZodiosEndpointDefinition;
  request: {
    body?: z.ZodTypeAny;
    path: readonly OperationParameterSchema[];
    query: readonly OperationParameterSchema[];
    header: readonly OperationParameterSchema[];
  };
  response: {
    validate: boolean;
    schema?: z.ZodTypeAny;
    successStatus?: number;
    reason?: string;
  };
};

const domainApis: Record<ContractDomainExportName, readonly ZodiosEndpointDefinition[]> = {
  auth: auth.authApi.api,
  ping: ping.pingApi.api,
  system: system.systemApi.api,
  subcontrollers: subcontrollers.subcontrollersApi.api,
  outputs: outputs.outputsApi.api,
  automations: automations.automationsApi.api,
  sensors: sensors.sensorsApi.api,
  deviceZones: deviceZones.deviceZonesApi.api,
  camera: camera.cameraApi.api,
  tags: tags.tagsApi.api,
  journals: journals.journalsApi.api,
};

// Remaining response-validation exclusions are intentional non-JSON transport responses.
// JSON endpoints should not be added here without a proven contract/runtime mismatch.
const responseValidationExclusions = new Map<ContractOperationId, string>([
  [
    "downloadSystemBackup",
    "intentional non-JSON transport exclusion: binary system backup download",
  ],
  [
    "downloadEsp32FirmwareBinary",
    "intentional non-JSON transport exclusion: binary ESP32 firmware bundle download",
  ],
  [
    "downloadEsp32FirmwareBootloader",
    "intentional non-JSON transport exclusion: binary ESP32 bootloader download",
  ],
  [
    "downloadEsp32FirmwarePartitions",
    "intentional non-JSON transport exclusion: binary ESP32 partition table download",
  ],
  [
    "downloadEsp32FirmwareApplication",
    "intentional non-JSON transport exclusion: binary ESP32 application download",
  ],
  ["getCameraStream", "intentional non-JSON transport exclusion: multipart camera stream"],
  ["getLatestCameraImage", "intentional non-JSON transport exclusion: binary camera image"],
  ["downloadTimelapseArchive", "intentional non-JSON transport exclusion: archive download"],
]);

const registry = buildRegistry();

export const operationRegistry = registry;

export function getOperationContract(operationId: ContractOperationId): OperationContract {
  const contract = operationRegistry[operationId];

  if (!contract) {
    throw new Error(`No generated contract registered for ${operationId}.`);
  }

  return contract;
}

function buildRegistry(): Record<ContractOperationId, OperationContract> {
  const contracts = {} as Record<ContractOperationId, OperationContract>;
  const seenOperationIds = new Set<string>();

  for (const domain of generatedApiContractManifest.domains) {
    const endpoints = domainApis[domain.exportName];
    const endpointsByAlias = new Map<string, ZodiosEndpointDefinition>();

    for (const endpoint of endpoints) {
      if (!endpoint.alias) {
        throw new Error(`Generated endpoint in domain ${domain.exportName} is missing an alias.`);
      }

      endpointsByAlias.set(endpoint.alias, endpoint);
    }

    for (const operationId of domain.operationIds) {
      const endpoint = endpointsByAlias.get(operationId);

      if (!endpoint) {
        throw new Error(
          `Generated endpoint metadata for ${operationId} was not found in domain ${domain.exportName}.`,
        );
      }

      if (seenOperationIds.has(operationId)) {
        throw new Error(`Duplicate operationId detected in validation registry: ${operationId}.`);
      }

      seenOperationIds.add(operationId);

      const bodySchema = getBodySchema(endpoint);
      const request = {
        path: getParameterSchemas(endpoint, "path"),
        query: getParameterSchemas(endpoint, "query"),
        header: getParameterSchemas(endpoint, "header"),
      };

      if (bodySchema) {
        Object.assign(request, { body: bodySchema });
      }

      contracts[operationId] = {
        operationId,
        domain,
        endpoint,
        request,
        response: getResponseValidationConfig(operationId, endpoint),
      };
    }
  }

  if (seenOperationIds.size !== generatedApiContractManifest.operationTotal) {
    throw new Error(
      `Validation registry expected ${generatedApiContractManifest.operationTotal} operations, found ${seenOperationIds.size}.`,
    );
  }

  return contracts;
}

function getBodySchema(endpoint: ZodiosEndpointDefinition): z.ZodTypeAny | undefined {
  const bodyParameter = endpoint.parameters?.find((parameter) => parameter.type === "Body");
  return bodyParameter?.schema;
}

function getParameterSchemas(
  endpoint: ZodiosEndpointDefinition,
  source: OperationParameterSource,
): readonly OperationParameterSchema[] {
  const targetType = sourceToZodiosType(source);

  return (endpoint.parameters ?? [])
    .filter((parameter) => parameter.type === targetType)
    .map((parameter) => ({
      name: parameter.name,
      schema: parameter.schema,
    }));
}

function getResponseValidationConfig(
  operationId: ContractOperationId,
  endpoint: ZodiosEndpointDefinition,
): OperationContract["response"] {
  const exclusionReason = responseValidationExclusions.get(operationId);

  if (exclusionReason) {
    return {
      validate: false,
      reason: exclusionReason,
    };
  }

  if (endpoint.response instanceof z.ZodVoid) {
    return {
      validate: false,
      reason: "intentional non-JSON transport exclusion: success response has no JSON body",
    };
  }

  // Verified against the real Packet 1 generated client surface and the Zodios endpoint type:
  // each generated endpoint exposes a single canonical success `response` schema and may expose
  // at most one optional success `status`. Packet 1 does not emit a status-to-schema response map,
  // so runtime validation can only resolve one success schema per operation.
  const responseConfig: OperationContract["response"] = {
    validate: true,
    schema: endpoint.response,
  };

  if (typeof endpoint.status === "number") {
    responseConfig.successStatus = endpoint.status;
  }

  return responseConfig;
}

function sourceToZodiosType(
  source: OperationParameterSource,
): "Body" | "Path" | "Query" | "Header" {
  switch (source) {
    case "body":
      return "Body";
    case "path":
      return "Path";
    case "query":
      return "Query";
    case "header":
      return "Header";
  }
}
