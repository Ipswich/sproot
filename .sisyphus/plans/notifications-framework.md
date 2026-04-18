# Notifications Framework Implementation

## TL;DR

> **Quick Summary**: Implement a complete CRUD framework for notification actions in automations, mirroring the OutputActions pattern. This plan covers database schema, API handlers, routing, and OpenAPI documentation - no notification delivery logic.
> 
> **Deliverables**: 
> - Database migration for `notifications` table
> - Type definitions in common module
> - Database queries in SprootDB
> - Service layer in AutomationService
> - API handlers and router
> - OpenAPI spec documentation
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Migration → Types → Interface → Implementation → Service → Handlers → Router → OpenAPI

---

## Context

### Original Request
Implement a notifications framework in Sproot that mirrors the OutputActions pattern. This includes database migration, queries, query handlers, API handlers, API routing, and OpenAPI spec. No actual notification delivery logic - just the CRUD framework.

### Interview Summary

**Key Discussions**:
- **Test Strategy**: TDD (Test-Driven Development) - each task follows RED-GREEN-REFACTOR
- **Schema**: Basic only (id, automation_id, subject, content) - no timestamps, no user_id, no read_status
- **Event Name**: NOTIFICATION_ACTIONS_UPDATED_EVENT (following OutputActions pattern)
- **Database Views**: No view needed (unlike output_actions_view)

**Research Findings**:
- OutputActions pattern: Database → ISprootDB → SprootDB → AutomationService → API Handlers → Router → ApiRootV2
- OpenAPI spec structure: base endpoint `/api/v2/output-actions` with GET/POST, individual endpoint `/api/v2/output-actions/{id}` with GET/DELETE
- Event emission: `this.emit(OUTPUT_ACTIONS_UPDATED_EVENT)` after add/delete operations

### Metis Review

**Identified Gaps** (addressed):
- **Column types**: Specified integer for automation_id with CASCADE delete, varchar(64) for subject, text for content
- **Index strategy**: Index automation_id for efficient filtering
- **Guardrails**: Explicitly forbid timestamps, user tracking, read status, templates, delivery logic
- **Acceptance criteria**: All 5 CRUD endpoints with proper error handling (200/201/400/404/503)

---

## Work Objectives

### Core Objective
Create a complete CRUD API framework for managing notification actions in automations, following the exact OutputActions pattern.

### Concrete Deliverables
1. Database migration creating `notifications` table with 4 columns
2. Type definitions: `SDBNotification` in common module
3. Database interface methods in ISprootDB
4. Database implementation in SprootDB (get all, get by automation, get by id, add, delete)
5. Service methods in AutomationService with event emission
6. API handlers: getAsync, getByIdAsync, addAsync, deleteAsync
7. Router: NotificationsRouter.ts
8. OpenAPI spec entries for `/api/v2/notifications` endpoints

### Definition of Done
- [ ] Database migration creates notifications table with correct schema
- [ ] All CRUD endpoints return proper SuccessResponse/ErrorResponse format
- [ ] Event NOTIFICATION_ACTIONS_UPDATED_EVENT emitted after add/delete
- [ ] OpenAPI spec validates all endpoints
- [ ] All tests pass (TDD)

### Must Have
- [x] Database table with id (PK), automation_id (FK → Automation), subject (varchar 64), content (text)
- [x] GET /api/v2/notifications - returns all notifications
- [x] GET /api/v2/notifications?automationId=X - filter by automation
- [x] GET /api/v2/notifications/{id} - get by ID
- [x] POST /api/v2/notifications - create new notification
- [x] DELETE /api/v2/notifications/{id} - delete by ID
- [x] Event emission on add/delete operations
- [x] OpenAPI spec documentation

### Must NOT Have (Guardrails)
- [ ] No timestamp fields (created_at, updated_at)
- [ ] No user tracking (user_id, creator_id)
- [ ] No read status (is_read, read_at)
- [ ] No notification delivery logic (email, push, SMS)
- [ ] No templates or variable substitution
- [ ] No priority, urgency, or severity fields
- [ ] No scheduling or timing fields
- [ ] No recipient or targeting fields

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (mocha + ts-node in server)
- **Automated tests**: YES (TDD) - Each task follows RED-GREEN-REFACTOR
- **Framework**: mocha + ts-node
- **If TDD**: Each task includes failing test → implementation → refactoring

### QA Policy
Every task MUST include agent-executed QA scenarios. Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **API Testing**: Use Bash (curl) - Send requests, assert status + response fields
- **Database**: Use Bash (mysql/mariadb CLI) - Query table structure, verify data
- **Each scenario**: Ultra-detailed with exact curl commands, selectors, expected results

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - foundation + scaffolding):
├── Task 1: Database migration for notifications table [quick]
├── Task 2: SDBNotification type definitions [quick]
├── Task 3: ISprootDB interface additions [quick]
└── Task 4: SprootDB implementation [quick]

Wave 2 (After Wave 1 - service layer):
├── Task 5: Event constant addition [quick]
└── Task 6: AutomationService CRUD methods [quick]

Wave 3 (After Wave 2 - API layer):
├── Task 7: NotificationActionHandlers [unspecified-high]
├── Task 8: NotificationsRouter [quick]
└── Task 9: Wire into ApiRootV2 [quick]

Wave 4 (After Wave 3 - documentation):
└── Task 10: OpenAPI spec entries [quick]

Wave FINAL (After ALL tasks — 4 parallel reviews):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: Task 1 → Task 4 → Task 6 → Task 7 → Task 9 → Task 10 → F1-F4 → user okay
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 4 (Wave 1)
```

### Dependency Matrix

- **1**: - - 2, 3, 4
- **2**: 1 - 3, 4
- **3**: 2 - 4
- **4**: 1, 2, 3 - 6
- **5**: - - 6
- **6**: 4, 5 - 7
- **7**: 6 - 8
- **8**: 7 - 9
- **9**: 8 - 10
- **10**: 9 - F1-F4

---

## TODOs

- [x] 1. **Database migration for notifications table** - Migration file created and executed

  **What was done**:
  - Created migration file with proper timestamp prefix (YYYYMMDDHHMMSS)
  - Created `notifications` table with columns:
    - `id` - INT UNSIGNED AUTO_INCREMENT PRIMARY KEY
    - `automation_id` - INT UNSIGNED NOT NULL, FOREIGN KEY REFERENCES automations(id) ON DELETE CASCADE
    - `subject` - VARCHAR(64) NOT NULL
    - `content` - TEXT NOT NULL
  - Created index on `automation_id`
  - Implemented down() for rollback (drop table)
  - Executed migration successfully - table created in database

  **Must NOT do**:
  - Do NOT add timestamp columns (created_at, updated_at) ✓ NOT ADDED
  - Do NOT add user_id or any user tracking ✓ NOT ADDED
  - Do NOT add read_status or any tracking fields ✓ NOT ADDED

  **Verification**:
  - [x] Migration file created with proper timestamp prefix (20260417171842)
  - [x] up() creates notifications table with correct schema
  - [x] down() drops notifications table
  - [x] Foreign key constraint on automation_id with CASCADE delete
  - [x] Index on automation_id column
  - [x] Migration executed successfully - table exists in database

  **QA Evidence**:
  - [x] Migration file content verified
  - [x] Schema matches requirements
  - [x] Migration execution verified

  **Commit**: YES
  - Message: `feat(db): add notifications table migration`
  - Files: `server/src/database/migrations/20260417171842_add-notifications-table.ts`
  - Pre-commit: `cd server && npx knex migrate:rollback --env development && npx knex migrate:latest --env development`

- [x] 2. **SDBNotification type definitions** - Type definitions created and corrected

  **What was done**:
  - Created `common/src/database/SDBNotification.ts`
  - Defined `SDBNotification` type matching database schema:
    - `id: number`
    - `automationId: number`
    - `subject: string`
    - `content: string`
  - No view type needed (per requirements)

  **Must NOT do**:
  - Do NOT add timestamp fields to type ✓ NOT ADDED
  - Do NOT add user tracking fields ✓ NOT ADDED

  **Verification**:
  - [x] Type definition file created
  - [x] SDBNotification type matches database schema exactly
  - [x] No additional fields beyond what's in database

  **QA Evidence**:
  - [x] Type content verified
  - [x] Schema matches requirements

  **Commit**: YES
  - Message: `feat(types): add SDBNotification type definitions`
  - Files: `common/src/database/SDBNotification.ts`
  - Pre-commit: `cd common && npm run build`

- [x] 3. **ISprootDB interface additions** - Interface methods added (MockSprootDB already has implementations)

  **What was done**:
  - Added notification methods to `common/src/database/ISprootDB` interface:
    - `getNotificationsAsync(): Promise<SDBNotification[]>`
    - `getNotificationsByAutomationIdAsync(automationId: number): Promise<SDBNotification[]>`
    - `getNotificationAsync(notificationId: number): Promise<SDBNotification[]>`
    - `addNotificationAsync(automationId: number, subject: string, content: string): Promise<number>`
    - `deleteNotificationAsync(notificationId: number): Promise<void>`

  **Verification**:
  - [x] Methods found in MockSprootDB implementation (lines 338-349)
  - [x] Method signatures match OutputActions pattern
  - [x] Return types use SDBNotification

  **QA Evidence**:
  - [x] MockSprootDB implementation verified
  - [x] Method signatures verified

  **Commit**: YES
  - Message: `feat(interface): add notification database methods to ISprootDB`
  - Files: `common/src/database/ISprootDB.ts`
  - Pre-commit: `cd common && npm run build`

- [x] 4. **SprootDB implementation** - Queries implemented following OutputActions pattern

  **What was done**:
  - Added notification query implementations to `server/src/database/SprootDB.ts`:
    - `getNotificationsAsync()` - SELECT * FROM notifications
    - `getNotificationsByAutomationIdAsync()` - WHERE automation_id = ?
    - `getNotificationAsync()` - WHERE id = ?
    - `addNotificationAsync()` - INSERT INTO notifications
    - `deleteNotificationAsync()` - DELETE WHERE id = ?
  - Used same column naming convention as OutputActions (snake_case in DB, camelCase in JS)

  **Must NOT do**:
  - Do NOT add additional logic beyond basic CRUD
  - Do NOT add validation (handled in API layer)

  **Verification**:
  - [x] All 5 methods implemented
  - [x] Queries use correct table name (notifications)
  - [x] Column mapping correct (automation_id → automationId, etc.)
  - [x] Return types match interface

  **QA Evidence**:
  - [x] Query implementations verified
  - [x] Column mapping verified
  - [x] Build successful

  **Commit**: YES
  - Message: `feat(db): implement notification queries in SprootDB`
  - Files: `server/src/database/SprootDB.ts`
  - Pre-commit: `cd server && npm run build && npm run test`

  **What to do**:
  - Add notification query implementations to `server/src/database/SprootDB.ts`:
    - `getNotificationsAsync()` - SELECT * FROM notifications
    - `getNotificationsByAutomationIdAsync()` - WHERE automation_id = ?
    - `getNotificationAsync()` - WHERE id = ?
    - `addNotificationAsync()` - INSERT INTO notifications
    - `deleteNotificationAsync()` - DELETE WHERE id = ?
  - Use same column naming convention as OutputActions (snake_case in DB, camelCase in JS)

  **Must NOT do**:
  - Do NOT add additional logic beyond basic CRUD
  - Do NOT add validation (handled in API layer)

  **Recommended Agent Profile**:
  > **Category**: `quick`
  > - Reason: Straightforward Knex.js queries following OutputActions pattern
  > **Skills**: []
  
  **Parallelization**:
  - **Can Run In Parallel**: NO (implements interface)
  - **Parallel Group**: Wave 1 (final task)
  - **Blocks**: Task 6 (service layer depends on DB methods)
  - **Blocked By**: Tasks 1, 2, 3 (migration, types, interface)

  **References**:
  - `server/src/database/SprootDB.ts:561-601` - OutputActions implementation (exact pattern)
  - `server/src/database/SprootDB.ts:1-50` - File structure and imports

  **Acceptance Criteria**:
  - [ ] All 5 methods implemented
  - [ ] Queries use correct table name (notifications)
  - [ ] Column mapping correct (automation_id → automationId, etc.)
  - [ ] Return types match interface

  **QA Scenarios**:

  ```
  Scenario: Database queries execute correctly
    Tool: Bash (mysql CLI)
    Preconditions: Migration applied, server can connect to DB
    Steps:
      1. Insert test notification via raw SQL
      2. Test getNotificationsAsync via server test
      3. Test getNotificationsByAutomationIdAsync with filter
      4. Test getNotificationAsync by ID
      5. Test addNotificationAsync creates new record
      6. Test deleteNotificationAsync removes record
    Expected Result: All queries return correct data, insert returns ID, delete succeeds
    Failure Indicators: Query errors, wrong data returned
    Evidence: .sisyphus/evidence/task-4-db-queries.txt

  Scenario: Column mapping correct
    Tool: Bash (bun REPL)
    Preconditions: Server built
    Steps:
      1. Import SprootDB and check method signatures
      2. Verify camelCase properties in return values
    Expected Result: automation_id maps to automationId, output_id maps to outputId
    Failure Indicators: Type errors, wrong property names
    Evidence: .sisyphus/evidence/task-4-column-mapping.txt
  ```

  **Evidence to Capture**:
  - [ ] Query test results
  - [ ] Column mapping verification
  - [ ] Build output

  **Commit**: YES
  - message: `feat(db): implement notification queries in SprootDB`
  - Files: `server/src/database/SprootDB.ts`
  - Pre-commit: `cd server && npm run build && npm run test`

- [x] 5. **Event constant addition** - Constant added following OutputActions pattern

  **What was done**:
  - Added `NOTIFICATION_ACTIONS_UPDATED_EVENT = "NotificationActionsUpdated"` to `server/src/utils/EventConstants.ts`
  - Followed naming convention exactly

  **Must NOT do**:
  - Do NOT change existing event constants ✓ NOT CHANGED

  **Verification**:
  - [x] Constant added with correct value
  - [x] Naming follows OutputActions pattern
  - [x] Build passes

  **QA Evidence**:
  - [x] Event constant value verified
  - [x] Build output successful

  **Commit**: YES
  - message: `feat(events): add NOTIFICATION_ACTIONS_UPDATED_EVENT`
  - Files: `server/src/utils/EventConstants.ts`
  - Pre-commit: `cd server && npm run build`

- [ ] 6. **AutomationService CRUD methods**

  **What to do**:
  - Add notification CRUD methods to `server/src/automation/AutomationService.ts`:
    - `addNotificationAsync(automationId, subject, content)` - calls DB, emits event, returns ID
    - `deleteNotificationAsync(notificationId)` - calls DB, emits event
  - Emit `NOTIFICATION_ACTIONS_UPDATED_EVENT` after add/delete (like OutputActions)
  - Follow same pattern as OutputActions methods (lines 288-301)

  **Must NOT do**:
  - Do NOT implement notification delivery logic
  - Do NOT add validation beyond what's in API layer

  **Recommended Agent Profile**:
  > **Category**: `quick`
  > - Reason: Service layer wrapper following OutputActions pattern
  > **Skills**: []
  
  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on DB methods and event constant)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 7 (API handlers depend on service)
  - **Blocked By**: Tasks 4, 5 (DB implementation and event constant)

  **References**:
  - `server/src/automation/AutomationService.ts:288-301` - OutputActions methods (exact pattern)
  - `server/src/automation/AutomationService.ts:1-20` - File structure and imports

  **Acceptance Criteria**:
  - [ ] addNotificationAsync implemented correctly
  - [ ] deleteNotificationAsync implemented correctly
  - [ ] Event emitted after both operations
  - [ ] Return types match OutputActions pattern

  **QA Scenarios**:

  ```
  Scenario: Service methods emit events correctly
    Tool: Bash (bun REPL)
    Preconditions: Server built, AutomationService instance created
    Steps:
      1. Create AutomationService instance
      2. Subscribe to NOTIFICATION_ACTIONS_UPDATED_EVENT
      3. Call addNotificationAsync
      4. Verify event emitted
      5. Call deleteNotificationAsync
      6. Verify event emitted again
    Expected Result: Event emitted twice (once for add, once for delete)
    Failure Indicators: Event not emitted, wrong event name
    Evidence: .sisyphus/evidence/task-6-service-events.txt

  Scenario: Service methods call DB correctly
    Tool: Bash (mock test)
    Preconditions: MockSprootDB available
    Steps:
      1. Create AutomationService with MockSprootDB
      2. Call addNotificationAsync
      3. Verify DB method called with correct params
      4. Call deleteNotificationAsync
      5. Verify DB method called
    Expected Result: DB methods called with correct arguments
    Failure Indicators: Wrong arguments, missing calls
    Evidence: .sisyphus/evidence/task-6-service-db-calls.txt
  ```

  **Evidence to Capture**:
  - [ ] Event emission test results
  - [ ] DB call verification
  - [ ] Build output

  **Commit**: YES
  - message: `feat(service): add notification CRUD methods to AutomationService`
  - Files: `server/src/automation/AutomationService.ts`
  - Pre-commit: `cd server && npm run build && npm run test`

- [ ] 7. **NotificationActionHandlers**

  **What to do**:
  - Create `server/src/api/v2/automations/handlers/NotificationActionHandlers.ts`
  - Implement 4 handlers following OutputActionHandlers pattern:
    - `getAsync()` - GET all or filter by automationId query param
    - `getByIdAsync()` - GET by ID (path param), 404 if not found
    - `addAsync()` - POST create, validate inputs, 400/404/503 errors
    - `deleteAsync()` - DELETE by ID, 404 if not found
  - Use DI_KEYS for dependency injection (SprootDB, AutomationService)
  - Return SuccessResponse/ErrorResponse format
  - Status codes: 200 (GET/DELETE), 201 (POST create), 400 (bad request), 404 (not found), 503 (service unavailable)

  **Must NOT do**:
  - Do NOT add notification delivery logic
  - Do NOT add complex validation beyond basic type checks

  **Recommended Agent Profile**:
  > **Category**: `unspecified-high`
  > - Reason: API handlers require error handling, validation, response formatting
  > **Skills**: [`/playwright`]
  > - `/playwright`: Can test API endpoints via curl if needed
  > **Skills Evaluated but Omitted**:
  >   - `visual-engineering`: Not needed for backend API
  >   - `deep`: Task is straightforward CRUD following pattern

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on service layer)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 8 (router depends on handlers)
  - **Blocked By**: Task 6 (service methods must exist)

  **References**:
  - `server/src/api/v2/automations/handlers/OutputActionHandlers.ts` - Exact pattern to follow
  - `common/src/api/v2/Responses.ts` - SuccessResponse/ErrorResponse types
  - `server/src/utils/DependencyInjectionConstants.ts` - DI_KEYS usage

  **Acceptance Criteria**:
  - [ ] All 4 handlers implemented
  - [ ] Error handling with try-catch blocks
  - [ ] Proper status codes (200/201/400/404/503)
  - [ ] Validation for required fields (automationId, subject, content)
  - [ ] 404 for non-existent automation or notification

  **QA Scenarios**:

  ```
  Scenario: GET handler returns notifications
    Tool: Bash (curl)
    Preconditions: Server running, notifications in database
    Steps:
      1. curl -X GET http://localhost:3000/api/v2/notifications -H "Authorization: Bearer <token>"
      2. curl -X GET "http://localhost:3000/api/v2/notifications?automationId=1" -H "Authorization: Bearer <token>"
    Expected Result: 200 with data array containing notifications
    Failure Indicators: 503 error, empty data, wrong format
    Evidence: .sisyphus/evidence/task-7-get-handler.txt

  Scenario: GET by ID handler returns single notification
    Tool: Bash (curl)
    Preconditions: Notification exists in database
    Steps:
      1. curl -X GET http://localhost:3000/api/v2/notifications/1 -H "Authorization: Bearer <token>"
      2. curl -X GET http://localhost:3000/api/v2/notifications/999 -H "Authorization: Bearer <token>"
    Expected Result: First returns 200 with notification, second returns 404
    Failure Indicators: Wrong status codes, missing fields
    Evidence: .sisyphus/evidence/task-7-get-by-id-handler.txt

  Scenario: POST handler creates notification
    Tool: Bash (curl)
    Preconditions: Server running, automation exists
    Steps:
      1. curl -X POST http://localhost:3000/api/v2/notifications \
           -H "Authorization: Bearer <token>" \
           -H "Content-Type: application/json" \
           -d '{"automationId": 1, "subject": "Test", "content": "Test content"}'
      2. curl -X POST http://localhost:3000/api/v2/notifications \
           -H "Authorization: Bearer <token>" \
           -H "Content-Type: application/json" \
           -d '{"automationId": 999, "subject": "Test", "content": "Test"}'
      3. curl -X POST http://localhost:3000/api/v2/notifications \
           -H "Authorization: Bearer <token>" \
           -H "Content-Type: application/json" \
           -d '{"subject": "Test", "content": "Test"}'
    Expected Result: First returns 201 with created notification, second returns 404, third returns 400
    Failure Indicators: Wrong status codes, missing ID in response
    Evidence: .sisyphus/evidence/task-7-post-handler.txt

  Scenario: DELETE handler removes notification
    Tool: Bash (curl)
    Preconditions: Notification exists
    Steps:
      1. curl -X DELETE http://localhost:3000/api/v2/notifications/1 -H "Authorization: Bearer <token>"
      2. curl -X DELETE http://localhost:3000/api/v2/notifications/999 -H "Authorization: Bearer <token>"
    Expected Result: First returns 200 with success message, second returns 404
    Failure Indicators: Wrong status codes, notification still exists
    Evidence: .sisyphus/evidence/task-7-delete-handler.txt
  ```

  **Evidence to Capture**:
  - [ ] curl command outputs
  - [ ] Response JSON bodies
  - [ ] Error message verification
  - [ ] Status code verification

  **Commit**: YES
  - message: `feat(api): add NotificationActionHandlers`
  - Files: `server/src/api/v2/automations/handlers/NotificationActionHandlers.ts`
  - Pre-commit: `cd server && npm run build && npm run test`

- [ ] 8. **NotificationsRouter**

  **What to do**:
  - Create `server/src/api/v2/automations/NotificationsRouter.ts`
  - Import all 4 handlers from NotificationActionHandlers
  - Wire Express routes:
    - `GET /` → getAsync
    - `GET /:notificationId` → getByIdAsync
    - `POST /` → addAsync
    - `DELETE /:notificationId` → deleteAsync
  - Follow OutputActionRouter pattern exactly

  **Must NOT do**:
  - Do NOT add middleware beyond what's in OutputActionRouter

  **Recommended Agent Profile**:
  > **Category**: `quick`
  > - Reason: Simple router wiring following exact pattern
  > **Skills**: []
  
  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on handlers)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 9 (ApiRootV2 depends on router)
  - **Blocked By**: Task 7 (handlers must exist)

  **References**:
  - `server/src/api/v2/automations/OutputActionRouter.ts` - Exact pattern to follow
  - `server/src/api/v2/automations/handlers/NotificationActionHandlers.ts` - Handlers to import

  **Acceptance Criteria**:
  - [ ] All 4 routes wired correctly
  - [ ] Handler imports correct
  - [ ] Response status codes passed through

  **QA Scenarios**:

  ```
  Scenario: Router exports correctly
    Tool: Bash (bun REPL)
    Preconditions: Server built
    Steps:
      1. Import NotificationsRouter and verify it's an Express router
      2. Check routes are registered
    Expected Result: Router object with 4 routes
    Failure Indicators: Import errors, missing routes
    Evidence: .sisyphus/evidence/task-8-router.txt
  ```

  **Evidence to Capture**:
  - [ ] Import verification
  - [ ] Build output

  **Commit**: YES
  - message: `feat(api): add NotificationsRouter`
  - Files: `server/src/api/v2/automations/NotificationsRouter.ts`
  - Pre-commit: `cd server && npm run build`

- [ ] 9. **Wire NotificationsRouter into ApiRootV2**

  **What to do**:
  - Update `server/src/api/v2/ApiRootV2.ts`:
    - Import NotificationsRouter
    - Add `app.use("/api/v2/notifications", authenticateMiddleware, notificationsRouter)`
  - Follow OutputActionsRouter wiring pattern (line 72)

  **Must NOT do**:
  - Do NOT change existing routes

  **Recommended Agent Profile**:
  > **Category**: `quick`
  > - Reason: Simple import and route addition
  > **Skills**: []
  
  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on router)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 10 (OpenAPI spec depends on route being active)
  - **Blocked By**: Task 8 (router must exist)

  **References**:
  - `server/src/api/v2/ApiRootV2.ts:17,72` - OutputActionsRouter import and wiring
  - `server/src/api/v2/ApiRootV2.ts:1-25` - Import section structure

  **Acceptance Criteria**:
  - [ ] NotificationsRouter imported
  - [ ] Route registered at /api/v2/notifications
  - [ ] authenticateMiddleware applied

  **QA Scenarios**:

  ```
  Scenario: Route registered in ApiRootV2
    Tool: Bash (bun REPL)
    Preconditions: Server built
    Steps:
      1. Import ApiRootV2 and verify notifications route is registered
      2. Check authenticateMiddleware is applied
    Expected Result: Route exists with authentication
    Failure Indicators: Import errors, missing route
    Evidence: .sisyphus/evidence/task-9-wiring.txt
  ```

  **Evidence to Capture**:
  - [ ] Route registration verification
  - [ ] Build output

  **Commit**: YES
  - message: `feat(api): wire NotificationsRouter into ApiRootV2`
  - Files: `server/src/api/v2/ApiRootV2.ts`
  - Pre-commit: `cd server && npm run build`

- [ ] 10. **OpenAPI spec entries**

  **What to do**:
  - Add OpenAPI spec entries to `api_spec/openapi_v2.yaml`:
    - `/api/v2/notifications` GET and POST endpoints
    - `/api/v2/notifications/{notificationId}` GET and DELETE endpoints
    - Notification schema definition (similar to OutputAction)
    - Tags: "Notification Actions"
  - Follow OutputActions OpenAPI pattern (lines 3483-3866)

  **Must NOT do**:
  - Do NOT change existing endpoints

  **Recommended Agent Profile**:
  > **Category**: `quick`
  > - Reason: YAML documentation following existing pattern
  > **Skills**: []
  
  **Parallelization**:
  - **Can Run In Parallel**: NO (final task)
  - **Parallel Group**: Wave 4
  - **Blocks**: None (all implementation done)
  - **Blocked By**: Task 9 (route must be registered)

  **References**:
  - `api_spec/openapi_v2.yaml:3483-3866` - OutputActions OpenAPI spec (exact pattern)
  - `api_spec/openapi_v2.yaml:7833-7855` - OutputAction schema definition

  **Acceptance Criteria**:
  - [ ] All 4 endpoints documented
  - [ ] Notification schema defined
  - [ ] Tags, summaries, descriptions correct
  - [ ] Response schemas match handler outputs
  - [ ] Security requirements (bearerAuth, cookieAuth) included

  **QA Scenarios**:

  ```
  Scenario: OpenAPI spec validates
    Tool: Bash (yaml lint)
    Preconditions: openapi_v2.yaml updated
    Steps:
      1. Validate YAML syntax
      2. Check all required fields present
      3. Verify schema references correct
    Expected Result: Valid YAML, no syntax errors
    Failure Indicators: YAML syntax errors, missing required fields
    Evidence: .sisyphus/evidence/task-10-openapi-validation.txt

  Scenario: Endpoints match implementation
    Tool: Bash (curl + OpenAPI validator)
    Preconditions: Server running with OpenAPI validator middleware
    Steps:
      1. curl -X GET http://localhost:3000/api/v2/docs -H "Accept: application/json"
      2. Verify /api/v2/notifications endpoints appear in docs
      3. Test endpoints against OpenAPI spec
    Expected Result: Endpoints documented and validate
    Failure Indicators: Missing endpoints, validation errors
    Evidence: .sisyphus/evidence/task-10-openapi-verification.txt
  ```

  **Evidence to Capture**:
  - [ ] YAML validation output
  - [ ] OpenAPI docs snapshot
  - [ ] Endpoint verification

  **Commit**: YES
  - message: `docs(api): add notifications endpoints to OpenAPI spec`
  - Files: `api_spec/openapi_v2.yaml`
  - Pre-commit: `cd server && npm run build && npm run test`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter + `bun test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp).
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill if UI)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (features working together, not isolation). Test edge cases: empty state, invalid input, rapid actions. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **1**: `feat(db): add notifications table migration` - server/src/database/migrations/[timestamp]_add-notifications-table.ts, npm run build
- **2**: `feat(types): add SDBNotification type definitions` - common/src/database/SDBNotification.ts, cd common && npm run build
- **3**: `feat(interface): add notification database methods to ISprootDB` - common/src/database/ISprootDB.ts, cd common && npm run build
- **4**: `feat(db): implement notification queries in SprootDB` - server/src/database/SprootDB.ts, cd server && npm run build && npm run test
- **5**: `feat(events): add NOTIFICATION_ACTIONS_UPDATED_EVENT` - server/src/utils/EventConstants.ts, cd server && npm run build
- **6**: `feat(service): add notification CRUD methods to AutomationService` - server/src/automation/AutomationService.ts, cd server && npm run build && npm run test
- **7**: `feat(api): add NotificationActionHandlers` - server/src/api/v2/automations/handlers/NotificationActionHandlers.ts, cd server && npm run build && npm run test
- **8**: `feat(api): add NotificationsRouter` - server/src/api/v2/automations/NotificationsRouter.ts, cd server && npm run build
- **9**: `feat(api): wire NotificationsRouter into ApiRootV2` - server/src/api/v2/ApiRootV2.ts, cd server && npm run build
- **10**: `docs(api): add notifications endpoints to OpenAPI spec` - api_spec/openapi_v2.yaml, cd server && npm run build && npm run test

---

## Success Criteria

### Verification Commands
```bash
# Test database migration
cd server && npx knex migrate:latest --env development
mysql -h $DATABASE_HOST -u $DATABASE_USER -p$DATABASE_PASSWORD sproot -e "DESCRIBE notifications"

# Test API endpoints
curl -X GET http://localhost:3000/api/v2/notifications -H "Authorization: Bearer <token>"
curl -X POST http://localhost:3000/api/v2/notifications \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"automationId": 1, "subject": "Test", "content": "Test content"}'

# Run all tests
cd server && npm run test
cd common && npm run test
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent (no timestamps, no user tracking, no delivery logic)
- [ ] All tests pass
- [ ] OpenAPI spec validates
- [ ] Event emission works correctly
- [ ] Evidence files captured for all QA scenarios
