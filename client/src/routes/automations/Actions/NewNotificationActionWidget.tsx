import { Button, Group, Stack, TextInput, Textarea } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Fragment } from "react/jsx-runtime";
import { addNotificationActionAsync } from "../../../requests/requests_v2";

export interface NewNotificationActionWidgetProps {
  automationId: number;
  toggleAddNewNotificationAction: () => void;
}

export default function NewNotificationActionWidget({
  automationId,
  toggleAddNewNotificationAction,
}: NewNotificationActionWidgetProps) {
  const queryClient = useQueryClient();
  const addNotificationActionMutation = useMutation({
    mutationFn: async (notificationAction: {
      subject: string;
      content: string;
    }) => {
      await addNotificationActionAsync(
        automationId,
        notificationAction.subject.trim(),
        notificationAction.content.trim(),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["notificationActions", automationId],
      });
    },
  });

  const notificationActionForm = useForm({
    initialValues: {
      subject: "",
      content: "",
    },
    validate: {
      subject: (value: string) =>
        value.trim().length > 0 ? null : "Subject must be provided",
      content: (value: string) =>
        value.trim().length > 0 ? null : "Content must be provided",
    },
  });

  return (
    <Fragment>
      <form
        onSubmit={notificationActionForm.onSubmit(async (values) => {
          await addNotificationActionMutation.mutateAsync(values);
          notificationActionForm.reset();
          toggleAddNewNotificationAction();
        })}
      >
        <Stack>
          <TextInput
            label="Subject"
            maxLength={128}
            {...notificationActionForm.getInputProps("subject")}
          />
          <Textarea
            label="Content"
            minRows={4}
            autosize
            maxLength={2000}
            {...notificationActionForm.getInputProps("content")}
          />
          <Group justify="center" mt="md">
            <Button type="submit">Save</Button>
          </Group>
        </Stack>
      </form>
    </Fragment>
  );
}
