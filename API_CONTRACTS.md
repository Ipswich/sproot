# API Contract Maintenance

This repository uses a single OpenAPI source of truth plus generated TypeScript and Zod contracts for runtime request and response validation.

## Canonical Workflow

The only canonical regeneration command is `npm run generate:api-contracts` from the repository root.

Use `npm run verify:api-contracts` to enforce both of these maintenance guarantees:

- generation remains deterministic across consecutive runs
- the recorded tree hash in `common/src/api/generated.sha256` still matches the canonical generated output

CI runs the verification command before the test suite. If it fails, regenerate with `npm run generate:api-contracts` and commit the resulting files.

## Ownership Rules

- `api_spec/openapi_v2.yaml` is the canonical external API contract.
- `scripts/generate-api-contracts.mjs` is the only supported generator entry point.
- `common/src/api/generated` is fully generated output and must not be edited by hand.
- `common/src/api/generated.sha256` is the committed drift baseline for the generated contract tree.
- Runtime validation wiring lives in `server/src/api/validation` and consumes generated contracts rather than duplicating request or response schemas.

Generated TypeScript and YAML artifacts carry a file header warning. The generated manifest JSON does not support comments, but it is still generated and covered by the same no-hand-edits rule.

## Validation Behavior

- Request validation uses generated parameter and body schemas before handlers run.
- Response validation uses the generated canonical success schema for JSON success responses before `response.json(...)` is emitted.
- Contract validation failures throw `ContractValidationError`, which preserves the operation id, validation phase, and field-level issue details.
- API v2 logs contract validation failures with operation id, phase, method, URL, and issue details. Request failures log at warning level. Response failures log at error level.

## Exclusion Policy

Response validation exclusions are intentionally limited to non-JSON transport endpoints. Do not add JSON operations to the exclusion registry unless there is a verified contract/runtime mismatch that cannot be represented accurately without weakening runtime correctness.

Current intentional exclusions:

- `downloadSystemBackup`
- `downloadEsp32FirmwareBinary`
- `downloadEsp32FirmwareBootloader`
- `downloadEsp32FirmwarePartitions`
- `downloadEsp32FirmwareApplication`
- `getCameraStream`
- `getLatestCameraImage`
- `downloadTimelapseArchive`

These exclusions are transport-driven, not parity debt. They should remain excluded until the runtime validation layer has explicit support for those non-JSON response types.