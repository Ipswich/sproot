import type {
  ZodiosBodyByAlias,
  ZodiosHeaderParamsByAlias,
  ZodiosPathParamByAlias,
  ZodiosQueryParamsByAlias,
  ZodiosResponseByAlias,
} from "@zodios/core";

import {
  auth,
  automations,
  camera,
  deviceZones,
  journals,
  outputs,
  ping,
  sensors,
  subcontrollers,
  system,
  tags,
} from "../generated";
import { generatedApiContractManifest } from "../generated/manifest";

import type * as AuthGenerated from "../generated/auth";
import type * as AutomationsGenerated from "../generated/automations";
import type * as CameraGenerated from "../generated/camera";
import type * as DeviceZonesGenerated from "../generated/device-zones";
import type * as JournalsGenerated from "../generated/journals";
import type * as OutputsGenerated from "../generated/outputs";
import type * as PingGenerated from "../generated/ping";
import type * as SensorsGenerated from "../generated/sensors";
import type * as SubcontrollersGenerated from "../generated/subcontrollers";
import type * as SystemGenerated from "../generated/system";
import type * as TagsGenerated from "../generated/tags";

type ContractDomainOperationsMap = {
  auth: AuthGenerated.operations;
  ping: PingGenerated.operations;
  system: SystemGenerated.operations;
  subcontrollers: SubcontrollersGenerated.operations;
  outputs: OutputsGenerated.operations;
  automations: AutomationsGenerated.operations;
  sensors: SensorsGenerated.operations;
  deviceZones: DeviceZonesGenerated.operations;
  camera: CameraGenerated.operations;
  tags: TagsGenerated.operations;
  journals: JournalsGenerated.operations;
};

type ContractDomainApiMap = {
  auth: typeof auth.authApi.api;
  ping: typeof ping.pingApi.api;
  system: typeof system.systemApi.api;
  subcontrollers: typeof subcontrollers.subcontrollersApi.api;
  outputs: typeof outputs.outputsApi.api;
  automations: typeof automations.automationsApi.api;
  sensors: typeof sensors.sensorsApi.api;
  deviceZones: typeof deviceZones.deviceZonesApi.api;
  camera: typeof camera.cameraApi.api;
  tags: typeof tags.tagsApi.api;
  journals: typeof journals.journalsApi.api;
};

type OperationDescriptor = {
  [DomainName in keyof ContractDomainOperationsMap]: {
    [OperationId in keyof ContractDomainOperationsMap[DomainName] & string]: {
      domain: DomainName;
      operationId: OperationId;
      operation: ContractDomainOperationsMap[DomainName][OperationId];
      api: ContractDomainApiMap[DomainName];
    };
  }[keyof ContractDomainOperationsMap[DomainName] & string];
}[keyof ContractDomainOperationsMap];

type SuccessStatusCode = 200 | 201 | 202 | 203 | 204 | 205 | 206 | 207 | 208 | 226;

export type ContractManifestDomainEntry = (typeof generatedApiContractManifest.domains)[number];
export type ContractDomainExportName = keyof ContractDomainOperationsMap;
export type ContractDomainName = ContractManifestDomainEntry["name"];
export type ContractOperationId = OperationDescriptor["operationId"];
export type ContractOperationDescriptor<OperationId extends ContractOperationId> = Extract<
  OperationDescriptor,
  { operationId: OperationId }
>;
export type ContractDomainForOperation<OperationId extends ContractOperationId> =
  ContractOperationDescriptor<OperationId>["domain"];
export type ContractManifestDomainForOperation<OperationId extends ContractOperationId> = Extract<
  ContractManifestDomainEntry,
  { exportName: ContractDomainForOperation<OperationId> }
>;
export type ContractGeneratedOperation<OperationId extends ContractOperationId> =
  ContractOperationDescriptor<OperationId>["operation"];
export type ContractGeneratedApi<OperationId extends ContractOperationId> =
  ContractOperationDescriptor<OperationId>["api"];
export type ContractOperationResponses<OperationId extends ContractOperationId> =
  ContractGeneratedOperation<OperationId>["responses"];
export type ContractOperationSuccessStatus<OperationId extends ContractOperationId> = Extract<
  keyof ContractOperationResponses<OperationId>,
  SuccessStatusCode
>;
export type ContractOperationRequestBody<OperationId extends ContractOperationId> =
  ZodiosBodyByAlias<ContractGeneratedApi<OperationId>, OperationId>;
export type ContractOperationPathParams<OperationId extends ContractOperationId> =
  ZodiosPathParamByAlias<ContractGeneratedApi<OperationId>, OperationId>;
export type ContractOperationQueryParams<OperationId extends ContractOperationId> =
  ZodiosQueryParamsByAlias<ContractGeneratedApi<OperationId>, OperationId>;
export type ContractOperationHeaderParams<OperationId extends ContractOperationId> =
  ZodiosHeaderParamsByAlias<ContractGeneratedApi<OperationId>, OperationId>;
export type ContractOperationSuccessResponse<OperationId extends ContractOperationId> =
  ZodiosResponseByAlias<ContractGeneratedApi<OperationId>, OperationId>;

export const contractDomainExportNames = generatedApiContractManifest.domains.map(
  (domain) => domain.exportName,
) as readonly ContractDomainExportName[];

export const contractOperationIds = generatedApiContractManifest.domains.flatMap((domain) => [
  ...domain.operationIds,
]) as readonly ContractOperationId[];
