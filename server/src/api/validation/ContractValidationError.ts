import { ZodError } from "zod";

export type ContractValidationPhase = "request" | "response";
export type ContractValidationSource = "body" | "params" | "query" | "headers" | "response";

type ContractValidationErrorOptions = {
  operationId: string;
  phase: ContractValidationPhase;
  details: string[];
};

export default class ContractValidationError extends Error {
  readonly status: number;
  readonly errors: string[];
  readonly operationId: string;
  readonly phase: ContractValidationPhase;

  constructor(options: ContractValidationErrorOptions) {
    const summary = `${capitalize(options.phase)} contract validation failed for ${
      options.operationId
    }.`;
    super(summary);

    this.name = options.phase === "request" ? "Bad Request" : "Internal Server Error";
    this.status = options.phase === "request" ? 400 : 500;
    this.errors = [summary, ...options.details];
    this.operationId = options.operationId;
    this.phase = options.phase;
  }

  static fromZodError(
    operationId: string,
    phase: ContractValidationPhase,
    source: ContractValidationSource,
    error: ZodError
  ): ContractValidationError {
    const details = error.issues.map((issue) => {
      const issuePath = issue.path.length > 0 ? issue.path.join(".") : "root";
      return `${source}.${issuePath}: ${issue.message}`;
    });

    return new ContractValidationError({
      operationId,
      phase,
      details,
    });
  }
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
