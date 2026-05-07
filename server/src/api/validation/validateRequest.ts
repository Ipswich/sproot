import type { Request } from "express";
import { z } from "zod";

import type { ContractOperationId } from "@sproot/sproot-common/dist/api/contracts/operation-types";

import ContractValidationError from "./ContractValidationError";
import { getOperationContract, type OperationContract, type OperationParameterSchema } from "./operationRegistry";

type ValidatedRequestData = {
  body?: unknown;
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  headers?: Record<string, unknown>;
};

export default function validateRequest(
  operationId: ContractOperationId,
  request: Request,
): ValidatedRequestData {
  return validateRequestAgainstContract(getOperationContract(operationId), request);
}

export function validateRequestAgainstContract(
  contract: OperationContract,
  request: Request,
): ValidatedRequestData {
  const validated: ValidatedRequestData = {};

  const params = validateParameterGroup(contract, "params", contract.request.path, request.params);
  if (params) {
    validated.params = params;
  }

  const query = validateParameterGroup(
    contract,
    "query",
    contract.request.query,
    request.query as Record<string, unknown>,
  );
  if (query) {
    validated.query = query;
  }

  if (contract.request.body) {
    const bodyResult = contract.request.body.safeParse(request.body);

    if (!bodyResult.success) {
      throw ContractValidationError.fromZodError(
        contract.operationId,
        "request",
        "body",
        bodyResult.error,
      );
    }

    validated.body = bodyResult.data;
  }

  const headers = validateParameterGroup(
    contract,
    "headers",
    contract.request.header,
    request.headers as Record<string, unknown>,
  );
  if (headers) {
    validated.headers = headers;
  }

  return validated;
}

function validateParameterGroup(
  contract: OperationContract,
  source: "params" | "query" | "headers",
  schemas: readonly OperationParameterSchema[],
  values: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (schemas.length === 0) {
    return undefined;
  }

  const normalizedValues = normalizeParameterGroupValues(schemas, values, source === "headers");
  const groupSchema = composeParameterGroupSchema(schemas);
  const parseResult = groupSchema.safeParse(normalizedValues);

  if (!parseResult.success) {
    throw ContractValidationError.fromZodError(
      contract.operationId,
      "request",
      source === "params" ? "params" : source === "query" ? "query" : "headers",
      parseResult.error,
    );
  }

  return parseResult.data;
}

function composeParameterGroupSchema(
  schemas: readonly OperationParameterSchema[],
): z.ZodObject<z.ZodRawShape> {
  const shape: z.ZodRawShape = {};

  for (const schemaEntry of schemas) {
    shape[schemaEntry.name] = schemaEntry.schema;
  }

  return z.object(shape);
}

function normalizeParameterGroupValues(
  schemas: readonly OperationParameterSchema[],
  values: Record<string, unknown>,
  caseInsensitive: boolean,
): Record<string, unknown> {
  const normalizedValues: Record<string, unknown> = {};

  for (const schemaEntry of schemas) {
    const rawValue = getNamedValue(values, schemaEntry.name, caseInsensitive);
    normalizedValues[schemaEntry.name] = normalizeScalarValue(schemaEntry.schema, rawValue);
  }

  return normalizedValues;
}

function getNamedValue(
  values: Record<string, unknown>,
  key: string,
  caseInsensitive: boolean,
): unknown {
  if (!caseInsensitive) {
    return values[key];
  }

  return values[key.toLowerCase()];
}

function normalizeScalarValue(schema: z.ZodTypeAny, value: unknown): unknown {
  const unwrappedSchema = unwrapSchema(schema);

  if (value === undefined || value === null) {
    return value;
  }

  if (unwrappedSchema instanceof z.ZodBoolean && typeof value === "string") {
    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }
  }

  if (unwrappedSchema instanceof z.ZodNumber && typeof value === "string") {
    const numericValue = Number(value);

    if (!Number.isNaN(numericValue)) {
      return numericValue;
    }
  }

  return value;
}

function unwrapSchema(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return unwrapSchema(schema.unwrap());
  }

  if (schema instanceof z.ZodDefault || schema instanceof z.ZodCatch || schema instanceof z.ZodReadonly) {
    return unwrapSchema(schema._def.innerType);
  }

  if (schema instanceof z.ZodEffects) {
    return unwrapSchema(schema.innerType());
  }

  if (schema instanceof z.ZodBranded) {
    return unwrapSchema(schema.unwrap());
  }

  if (schema instanceof z.ZodPipeline) {
    return unwrapSchema(schema._def.out);
  }

  return schema;
}
