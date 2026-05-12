import type { ContractOperationId } from "@sproot/sproot-common/dist/api/contracts/operation-types";

import ContractValidationError from "./ContractValidationError";
import { getOperationContract, type OperationContract } from "./operationRegistry";

export default function validateResponse(
  operationId: ContractOperationId,
  body: unknown,
  statusCode: number,
): void {
  validateResponseAgainstContract(getOperationContract(operationId), body, statusCode);
}

export function validateResponseAgainstContract(
  contract: OperationContract,
  body: unknown,
  statusCode: number,
): void {
  if (!contract.response.validate) {
    return;
  }

  if (!isSuccessStatus(statusCode)) {
    return;
  }

  if (
    typeof contract.response.successStatus === "number" &&
    contract.response.successStatus !== statusCode
  ) {
    throw new ContractValidationError({
      operationId: contract.operationId,
      phase: "response",
      details: [
        `response used HTTP status ${statusCode}, but generated contract metadata declares ${contract.response.successStatus}.`,
      ],
    });
  }

  if (!contract.response.schema) {
    return;
  }

  if (typeof body === "object" && body !== null && "statusCode" in body) {
    const responseBody = body as { statusCode?: unknown };

    if (typeof responseBody.statusCode === "number" && responseBody.statusCode !== statusCode) {
      throw new ContractValidationError({
        operationId: contract.operationId,
        phase: "response",
        details: [
          `response.statusCode (${responseBody.statusCode}) does not match HTTP status (${statusCode}).`,
        ],
      });
    }
  }

  const parseResult = contract.response.schema.safeParse(body);

  if (!parseResult.success) {
    throw ContractValidationError.fromZodError(
      contract.operationId,
      "response",
      "response",
      parseResult.error,
    );
  }
}

function isSuccessStatus(statusCode: number): boolean {
  return statusCode >= 200 && statusCode < 300;
}
