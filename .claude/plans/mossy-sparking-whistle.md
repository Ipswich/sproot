# Add Notification Feature to Automations

## Context

The user wants to add a notification feature tied to automations. When an automation evaluates to true, a notification should be sent. Currently, the system has "output actions" that control outputs when conditions are met, but there's no way to send notifications independently.

The feature should be generic enough to support future notification channels (Discord, SMS, email, push notifications) starting with just a dismissable banner in the UI.

**Key Architectural Clarification**: NotificationManager must have its own `evaluate()` method that evaluates ALL automation conditions (without output filtering). The user explicitly stated that OutputBase should call `notificationManager.send()` - NotificationManager is responsible for evaluation, not OutputBase.

## Design

### Backend (Server)

1. **Database Model** - Create a new `notification_actions` table
   - Schema: `notification_action_id (serial)`, `automation_id` (FK to automations), `subject` (text), `content` (text)
   - Notifications don't trigger outputs - output control is handled by OutputActions
   - `subject` will be used as a title/header for notifications
   - `content` contains the full notification message

2. **API Handler** - Create `NotificationHandlers.ts` following existing handler patterns
   - `getAsync` - Get all notifications
   - `getByIdAsync` - Get single notification
   - `addAsync` - Create notification
   - `updateAsync` - Update notification content
   - `deleteAsync` - Delete notification
   - Endpoint: `/api/v2/notifications`

3. **Notification Manager** - Create `NotificationManager.ts` in `server/src/automation/notifications/`
   - `evaluate(sensorList, outputList, automationTimeout, now)` - evaluates ALL automation conditions (matches OutputAutomationManager signature exactly)
   - Maintains a queue of notifications that evaluated to true
   - `send(notifications)` - sends all notifications from the queue to the UI
   - `subject` field will be displayed as the banner title
   - `content` field will be the notification message
   - **Critical**: Must use `this.#automations` (same as OutputAutomationManager) and the same collision handling logic

4. **Execution Integration** - Modify `OutputBase.ts` to:
   - Add `#notificationManager` instance to OutputBase
   - Add a static `notificationManager` on the Express app (via `app.set("notificationManager", ...)` in program.ts)
   - Modify `runAutomationsAsync()` to call `notificationManager.send()` after output automation evaluation
   - Get NotificationManager from `app.get("notificationManager")`

### Frontend (Client)

1. **Notification Types** - Add `INotification` type to `common/src/automation/INotification.ts`
   - `id: string`
   - `automationId: number`
   - `subject: string`
   - `content: string`

2. **API Types** - Add to `common/src/api/notifications.ts`
   - Request/Response types for notifications

3. **Request Functions** - Add to `client/src/requests/requests_v2.tsx`
   - `getNotificationsAsync()`
   - `getNotificationByAutomationIdAsync()`
   - `addNotificationAsync()`
   - `updateNotificationAsync()`
   - `deleteNotificationAsync()`

4. **UI Component** - Add a notification display component in the automations page:
   - Show active/dismissible notifications
   - Display subject as the notification title
   - Display content as the notification message
   - Allow users to view/edit notification subject and content

## API Endpoints

```
GET    /api/v2/notifications
GET    /api/v2/notifications/:id
POST   /api/v2/notifications
POST   /api/v2/notifications/notify - Trigger a notification (internal)
PATCH  /api/v2/notifications/:id
DELETE /api/v2/notifications/:id
```

## Migration

Create migration file to add `notification_actions` table:
- Table: `notification_actions`
- Columns: `id`, `automation_id`, `subject`, `content`
- Foreign key to `automations` only

## Files to Modify

### Common
- `common/src/automation/INotification.ts` (new file)
- `common/src/api/notifications.ts` (new file)

### Server
- Migration file for `notification_actions` table
- `server/src/api/v2/notifications/NotificationRouter.ts` (new)
- `server/src/api/v2/automations/handlers/NotificationHandlers.ts` (new)
- `server/src/automation/notifications/NotificationManager.ts` (new)
- `server/src/program.ts` (add notificationManager instance)
- `server/src/outputs/base/OutputBase.ts` (add #notificationManager field and send() call)

### Client
- `client/src/requests/requests_v2.tsx` (add notification request functions)
- `client/src/automations/Notifications.tsx` (new component)
- `client/src/routes/automations/Automations.tsx` (add notifications panel)

## Testing

1. API tests - Follow existing test patterns for other handlers
2. Integration - Verify notifications fire when automation evaluates to true
3. UI - Verify notifications display and can be dismissed in the UI
