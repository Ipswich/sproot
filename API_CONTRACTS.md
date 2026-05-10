# API Contract Closeout

This document is the migration closeout and engineering handoff for Sproot's generated API contract system. It describes the final architecture, runtime validation flow, deterministic generation workflow, intentional exclusions, known debt, operational guidance, and the safe developer workflow for future endpoint changes.

## Final Architecture

The contract system has four layers:

1. `api_spec/openapi_v2.yaml` is the canonical external API contract.
2. `scripts/generate-api-contracts.mjs` slices that spec into stable domains and generates committed TypeScript, Zod, YAML, and manifest artifacts under `common/src/api/generated`.
3. `common/src/api/contracts/operation-types.ts` turns the generated manifest and domain exports into typed operation identifiers and operation-specific request and response types.
4. `server/src/api/validation` consumes those generated contracts at runtime through `operationRegistry`, `createContractRoute`, `validateRequest`, and `validateResponse`.

```mermaid
flowchart LR
	spec[api_spec/openapi_v2.yaml]
	gen[scripts/generate-api-contracts.mjs]
	generated[common/src/api/generated/**]
	manifest[common/src/api/generated/manifest]
	hash[common/src/api/generated.sha256]
	types[common/src/api/contracts/operation-types.ts]
	runtime[server/src/api/validation/**]
	routes[server/src/api/v2/** routers]

	spec --> gen
	gen --> generated
	gen --> manifest
	gen --> hash
	manifest --> types
	generated --> types
	generated --> runtime
	types --> runtime
	runtime --> routes
```

### Domain Layout

Generated contracts are intentionally split by stable API domains instead of emitted as one monolith. The current domains are `auth`, `ping`, `system`, `subcontrollers`, `outputs`, `automations`, `sensors`, `device-zones`, `camera`, `tags`, and `journals`.

### Ownership Rules

- `api_spec/openapi_v2.yaml` is the only source of truth for public transport contracts.
- `scripts/generate-api-contracts.mjs` is the only supported generation entry point.
- `common/src/api/generated` is generated-only and must not be edited by hand.
- `common/src/api/generated.sha256` is the committed drift baseline for the generated tree.
- Runtime validation logic belongs in `server/src/api/validation` and should consume generated schemas rather than duplicate contract definitions.

Generated TypeScript and YAML files include generated-file warnings. The manifest JSON cannot carry comments, but it is still generated-only.

## Runtime Validation Flow

The server currently runs two validation layers:

- legacy `express-openapi-validator` middleware in `server/src/api/v2/ApiRootV2.ts`
- generated-contract validation in `server/src/api/validation/**`

The generated layer is the long-term transport contract path. The legacy layer remains active as a compatibility bridge and is documented under technical debt below.

### Request Lifecycle

```mermaid
sequenceDiagram
	participant Client
	participant Express
	participant Legacy as express-openapi-validator
	participant Route as createContractRoute
	participant Registry as operationRegistry
	participant Handler

	Client->>Express: HTTP request
	Express->>Legacy: OpenAPI request validation
	Express->>Route: matched router handler
	Route->>Registry: resolve operation contract by operationId
	Route->>Route: validateRequestAgainstContract(...)
	Route->>Handler: invoke handler
	Handler-->>Route: return or call response.json(...)
```

Request validation behavior:

- `createContractRoute(operationId, handler)` resolves the generated contract once when the route wrapper is created.
- Before the handler runs, `validateRequestAgainstContract` validates path, query, body, and header inputs against generated Zod schemas.
- Parameter normalization converts common string transport values into schema-compatible scalars where appropriate, including booleans and numbers.
- Validation failures are raised as `ContractValidationError` with `phase = "request"`, HTTP status `400`, the operation id, and field-level details.

### Response Lifecycle

```mermaid
sequenceDiagram
	participant Handler
	participant Route as createContractRoute
	participant Response as response.json monkey patch
	participant Validator as validateResponseAgainstContract
	participant Client

	Handler->>Route: response.json(body)
	Route->>Response: intercepted json call
	Response->>Validator: validate success status + body
	Validator-->>Response: pass or throw ContractValidationError
	Response-->>Client: JSON response emitted
```

Response validation behavior:

- `createContractRoute` temporarily monkey-patches `response.json` for the lifetime of the route handler.
- When a handler emits JSON, `validateResponseAgainstContract` checks the generated success response before the payload is sent.
- Validation applies only to successful HTTP statuses and only when the registry marks the operation as response-validatable.
- If generated metadata declares a canonical success status, the runtime status must match it.
- If the response body includes a `statusCode`, that field must match the actual HTTP status.
- The success payload is parsed with the generated Zod schema from the registered endpoint.
- Validation failures are raised as `ContractValidationError` with `phase = "response"` and HTTP status `500`.

### How `operationRegistry` Works

`server/src/api/validation/operationRegistry.ts` is the runtime index of generated contracts.

It performs these responsibilities at startup:

1. Imports every generated domain API surface from `@sproot/sproot-common/dist/api/generated`.
2. Reads `generatedApiContractManifest` and iterates every domain and operation id.
3. Locates the matching generated Zodios endpoint definition by alias.
4. Extracts request body, path, query, and header schemas into a normalized `OperationContract` object.
5. Computes response validation behavior, including intentional exclusions.
6. Fails fast on duplicate operation ids, missing generated endpoint metadata, or operation count drift.

This gives the runtime layer one authoritative lookup table keyed by `ContractOperationId`.

### How `createContractRoute` Works

`server/src/api/validation/createContractRoute.ts` is the route-level integration point.

It performs these steps for each wrapped route:

1. Resolve the operation contract from `operationRegistry`.
2. Optionally validate the incoming request with `validateRequestAgainstContract`.
3. Temporarily replace `response.json` so outgoing JSON success bodies are validated before emission.
4. Run the actual handler.
5. Restore the original `response.json` in `finally`, even when the handler throws.

This wrapper keeps validation attached to concrete operation ids instead of relying on ad hoc handler-level checks.

### How to Debug `ContractValidationError`

`ContractValidationError` is the canonical exception type for generated request and response mismatches.

When debugging one:

1. Capture `operationId`, `phase`, `method`, `url`, and `details` from the API v2 logger output.
2. Open `server/src/api/validation/operationRegistry.ts` and confirm whether the operation is excluded or expected to validate.
3. Check the generated domain client under `common/src/api/generated/<domain>/client.ts` to inspect the concrete Zod schema for the operation alias.
4. Compare the live handler payload with the generated success schema, not just the TypeScript types.
5. If the mismatch is real, update `api_spec/openapi_v2.yaml`, regenerate contracts, and re-run verification.
6. If the runtime behavior is intentionally non-JSON, verify whether the operation belongs in the non-JSON exclusion set rather than weakening the schema for JSON routes.

The API v2 error middleware logs contract validation failures with:

- operation id
- validation phase
- HTTP method
- URL
- field-level details

Request failures log at warning level. Response failures log at error level.

## Generation Flow And CI Enforcement

### Canonical Regeneration Workflow

The only supported regeneration command is:

```bash
npm run generate:api-contracts
```

Run it from the repository root.

The generator performs these steps:

1. Parse `api_spec/openapi_v2.yaml`.
2. Assert the expected operation count.
3. Slice the OpenAPI spec into stable domains by path prefix.
4. Emit per-domain `openapi.yaml`, `types.ts`, `client.ts`, and `index.ts` files.
5. Emit a generated manifest in both JSON and TypeScript form.
6. Add generated-file headers.
7. Write the canonical tree hash to `common/src/api/generated.sha256`.

### Deterministic Generation Enforcement

Determinism is enforced by:

```bash
npm run verify:api-contracts
```

`scripts/verify-api-contracts.mjs` runs the generator twice, hashes the entire generated tree after each run, and then fails if either of these is true:

- the two generated hashes differ, proving nondeterministic output
- the final hash differs from the committed `common/src/api/generated.sha256`, proving drift

This makes `verify:api-contracts` both a determinism check and a repository drift check.

### CI Enforcement

CI runs `npm run verify:api-contracts` before unit tests and API tests in `.github/workflows/Test.yaml`.

If CI fails on this step, the expected remediation is:

1. update `api_spec/openapi_v2.yaml` or generator code as intended
2. run `npm run generate:api-contracts`
3. review generated output and `common/src/api/generated.sha256`
4. commit the generated changes
5. re-run `npm run verify:api-contracts`

## Developer Workflow

### Regenerating Contracts Safely

Use this workflow whenever a public endpoint contract changes:

1. Edit `api_spec/openapi_v2.yaml` first.
2. Ensure the endpoint has the correct `operationId` and schema definitions.
3. Run `npm run generate:api-contracts` from the repository root.
4. Review changes under `common/src/api/generated/**`, `common/src/api/generated/manifest/**`, and `common/src/api/generated.sha256`.
5. Run `npm run verify:api-contracts`.
6. Build `common` and `server` if the change affects runtime wiring.
7. Run relevant tests, especially API tests for the touched endpoint.

Do not hand-edit generated files to make verification pass.

### Adding New Endpoints Safely

Use this workflow for a new API route:

1. Add or update the endpoint in `api_spec/openapi_v2.yaml` with a unique `operationId`.
2. Ensure request parameters, request body, and success response are fully described in the spec.
3. Regenerate contracts with `npm run generate:api-contracts`.
4. Verify the new operation appears in the correct generated domain and in the manifest.
5. Wire the server route with `createContractRoute("yourOperationId", handler)`.
6. Return JSON payloads that match the generated success schema exactly.
7. Add request and response tests, including at least one negative-path validation test when practical.
8. Only add a response exclusion if the endpoint is truly non-JSON transport and cannot be represented as a JSON success body.

### Runtime Validation Checklist For Endpoint Authors

Before merging an endpoint change, verify all of the following:

- request path params, query params, headers, and body are represented in the OpenAPI spec
- success response schema matches the real JSON payload
- HTTP success status matches the generated endpoint metadata
- handler-level `statusCode` fields match the actual HTTP status
- the route is wrapped with the correct operation id
- the endpoint is not added to the exclusion registry unless it is transport-driven

## Remaining Intentional Exclusions

Response validation exclusions are intentionally limited to non-JSON success transports.

Current intentional exclusions:

- `downloadSystemBackup`
- `downloadEsp32FirmwareBinary`
- `downloadEsp32FirmwareBootloader`
- `downloadEsp32FirmwarePartitions`
- `downloadEsp32FirmwareApplication`
- `getCameraStream`
- `getLatestCameraImage`
- `downloadTimelapseArchive`

Why these remain excluded:

- they return binary, archive, image, or multipart stream responses
- the current generated runtime path validates JSON success bodies only
- keeping them excluded avoids weakening JSON response validation for the rest of the API

These are intentional transport exclusions, not schema-parity debt.

## Known Technical Debt

The migration is operational, but these items remain deliberately unresolved:

- `express-openapi-validator` is still active in `server/src/api/v2/ApiRootV2.ts`, so request and response validation currently run through both the legacy and generated layers.
- `scripts/generate-api-contracts.mjs` uses `stabilizeZodClientTypes(...)`, which relies on exact string replacements against generator output and is therefore brittle to upstream output changes.
- The generated manifest is emitted twice, once as JSON and once as TypeScript, which duplicates the same metadata in two committed artifacts.
- Several transport-facing schema names in the OpenAPI document still reflect persistence models, which leaks repository naming into the public contract surface.
- Error-response validation is still intentionally excluded from the generated runtime path.
- Negative-path tests around contract validation are thinner than the positive-path API coverage.
- `validateRequest.ts` and `validateResponse.ts` still expose default exports that appear to be compatibility leftovers rather than the dominant runtime entry points.

## Operational Risks And Monitoring Recommendations

### Operational Risks

- Dual validation layers can create duplicate work, duplicate failure modes, and harder-to-interpret validation errors.
- Response validation on large JSON success payloads adds real parsing cost, especially on chart-style endpoints.
- Contract drift becomes a release risk if generated artifacts are modified or omitted outside the canonical workflow.
- The generator post-processing step can break silently if upstream codegen output changes format.
- Non-JSON endpoints will remain unvalidated on the generated response path until transport-aware validation is added.

### Monitoring Recommendations

Monitor these signals in production and CI:

1. Count `ContractValidationError` events by `operationId` and `phase`.
2. Alert on any response-phase validation failure because it indicates contract/runtime divergence in a success path.
3. Track warning-level request validation failures separately from server-side 500s.
4. Keep `verify:api-contracts` mandatory in CI and investigate any nondeterminism immediately.
5. Watch latency on large JSON endpoints after schema changes that widen response bodies.
6. Periodically review the exclusion registry to confirm every excluded operation is still transport-driven.

## Suggested Backlog Items

These are the next actionable improvement items after closeout:

1. Remove the legacy `express-openapi-validator` bridge once generated validation coverage and confidence are sufficient.
2. Replace the string-based `stabilizeZodClientTypes(...)` post-processing with a less brittle generator integration.
3. Add generated negative-path API tests for request and response validation failures on representative endpoints.
4. Add transport-aware runtime validation or explicit adapter support for binary, image, archive, and multipart success responses.
5. Rename persistence-shaped OpenAPI component names to transport-oriented names where public contract clarity matters.
6. Consolidate duplicated manifest outputs if the JSON artifact is no longer required by any tooling.
7. Decide whether the default exports in `validateRequest.ts` and `validateResponse.ts` should be removed or formally retained as compatibility APIs.