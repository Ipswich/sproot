import {
  Button,
  Group,
  SegmentedControl,
  Select,
  Slider,
  Stack,
  Switch,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addNotificationActionAsync,
  addOutputActionAsync,
} from "../../../requests/requests_v2";

type ActionType = "output" | "notification";

export interface AddActionWidgetProps {
  automationId: number;
  outputs: {
    id: number;
    parentOutputId: number | null;
    name: string;
    isPwm: boolean;
  }[];
  onSaved: () => void;
}

export default function AddActionWidget({
  automationId,
  outputs,
  onSaved,
}: AddActionWidgetProps) {
  const queryClient = useQueryClient();
  const rootOutputs = outputs.filter(
    (output) => output.parentOutputId === null,
  );

  const actionForm = useForm({
    initialValues: {
      actionType: "output" as ActionType,
      outputId: String(rootOutputs[0]?.id ?? ""),
      value: rootOutputs[0]?.isPwm ? 50 : 100,
      subject: "",
      content: "",
    },
    validate: {
      outputId: (value, values) =>
        values.actionType === "output" && value.trim().length === 0
          ? "Output must be provided"
          : null,
      subject: (value, values) =>
        values.actionType === "notification" && value.trim().length === 0
          ? "Subject must be provided"
          : null,
      content: (value, values) =>
        values.actionType === "notification" && value.trim().length === 0
          ? "Content must be provided"
          : null,
    },
  });

  const addActionMutation = useMutation({
    mutationFn: async (values: typeof actionForm.values) => {
      if (values.actionType === "output") {
        await addOutputActionAsync(
          automationId,
          parseInt(values.outputId),
          values.value,
        );
        return;
      }

      await addNotificationActionAsync(
        automationId,
        values.subject.trim(),
        values.content.trim(),
      );
    },
    onSettled: async (_data, _error, values) => {
      if (values.actionType === "output") {
        await queryClient.invalidateQueries({
          queryKey: ["outputActions", automationId],
        });
      } else {
        await queryClient.invalidateQueries({
          queryKey: ["notificationActions", automationId],
        });
      }
    },
  });

  return (
    <form
      onSubmit={actionForm.onSubmit(async (values) => {
        await addActionMutation.mutateAsync(values);
        actionForm.reset();
        actionForm.setFieldValue("actionType", "output");
        actionForm.setFieldValue("outputId", String(rootOutputs[0]?.id ?? ""));
        actionForm.setFieldValue("value", rootOutputs[0]?.isPwm ? 50 : 100);
        onSaved();
      })}
    >
      <Stack>
        <SegmentedControl
          fullWidth
          radius="md"
          data={[
            { value: "output", label: "Output" },
            { value: "notification", label: "Notification" },
          ]}
          {...actionForm.getInputProps("actionType")}
          onChange={(value) => {
            actionForm.setFieldValue("actionType", value as ActionType);
          }}
        />
        {actionForm.values.actionType === "output" ? (
          rootOutputs.length === 0 ? (
            <Text c="dimmed">No outputs are available for output actions.</Text>
          ) : (
            <>
              <Select
                data={rootOutputs.map((output) => ({
                  value: String(output.id),
                  label: output.name,
                }))}
                label="Output"
                {...actionForm.getInputProps("outputId")}
                onChange={(value) => {
                  actionForm.setFieldValue("outputId", value ?? "");
                  const selectedOutput = rootOutputs.find(
                    (output) => String(output.id) === value,
                  );
                  actionForm.setFieldValue(
                    "value",
                    selectedOutput?.isPwm ? 50 : 100,
                  );
                }}
              />
              {rootOutputs.find(
                (output) => String(output.id) === actionForm.values.outputId,
              )?.isPwm ? (
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  label={(value) => `${value}%`}
                  marks={[
                    { value: 20, label: "20%" },
                    { value: 50, label: "50%" },
                    { value: 80, label: "80%" },
                  ]}
                  {...actionForm.getInputProps("value")}
                />
              ) : (
                <Group justify="center">
                  <Switch
                    size="xl"
                    onLabel="On"
                    offLabel="Off"
                    checked={actionForm.values.value === 100}
                    onChange={(event) => {
                      actionForm.setFieldValue(
                        "value",
                        event.target.checked ? 100 : 0,
                      );
                    }}
                  />
                </Group>
              )}
            </>
          )
        ) : (
          <>
            <TextInput
              label="Subject"
              maxLength={128}
              {...actionForm.getInputProps("subject")}
            />
            <Textarea
              label="Content"
              minRows={4}
              autosize
              maxLength={2000}
              {...actionForm.getInputProps("content")}
            />
          </>
        )}
        <Group justify="center" mt="md">
          <Button type="submit">Save</Button>
        </Group>
      </Stack>
    </form>
  );
}
