import { Stack, Text } from "@mantine/core";
import { SDBNotificationAction } from "@sproot/database/SDBNotificationAction";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment } from "react/jsx-runtime";
import {
  deleteNotificationActionAsync,
  getNotificationActionsByAutomationIdAsync,
} from "../../../requests/requests_v2";
import DeletablesTable from "../../common/DeletablesTable";

export interface NotificationActionsTableProps {
  automationId: number;
  readOnly?: boolean;
}

export default function NotificationActionsTable({
  automationId,
  readOnly = false,
}: NotificationActionsTableProps) {
  const queryClient = useQueryClient();

  const notificationActionsQuery = useQuery({
    queryKey: ["notificationActions", automationId],
    queryFn: () => getNotificationActionsByAutomationIdAsync(automationId),
  });

  const deleteNotificationActionMutation = useMutation({
    mutationFn: async (notificationActionId: number) => {
      await deleteNotificationActionAsync(notificationActionId);
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["notificationActions", automationId],
      });
    },
  });

  const notificationActionRows =
    notificationActionsQuery.data?.map((notificationAction) => ({
      displayLabel: NotificationActionRow(notificationAction),
      id: notificationAction.id,
      deleteFn: (id: number) =>
        deleteNotificationActionMutation.mutateAsync(id),
    })) ?? [];

  return (
    <Fragment>
      {notificationActionsQuery.isLoading ? (
        <div>Loading...</div>
      ) : (
        <Fragment>
          {notificationActionRows.length === 0 ? (
            <Text c="dimmed">None</Text>
          ) : (
            <DeletablesTable
              deletables={notificationActionRows}
              readOnly={readOnly}
            />
          )}
        </Fragment>
      )}
    </Fragment>
  );
}

function NotificationActionRow(notificationAction: SDBNotificationAction) {
  return (
    <Stack gap={2} align="flex-start">
      <Text fw={500}>{notificationAction.subject}</Text>
      <Text size="sm" c="dimmed" lineClamp={2} ta="left">
        {notificationAction.content}
      </Text>
    </Stack>
  );
}
