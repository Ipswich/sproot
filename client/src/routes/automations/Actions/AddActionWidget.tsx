import {
  Alert,
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
import {
  OUTPUT_ACTION_PRECEDENCE_VALUES,
  OutputActionPrecedence,
} from "@sproot/common/automation/OutputActionPrecedence";
import { IOutputBase } from "@sproot/outputs/IOutputBase";
import { useForm } from "@mantine/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addNotificationActionAsync,
  addOutputActionAsync,
} from "../../../requests/requests_v2";

type ActionType = "output" | "notification";

type AddActionOutputOption = Pick<
  IOutputBase,
  "id" | "parentOutputId" | "name" | "isPwm" | "actionWarnings"
>;

export interface AddActionWidgetProps {
  automationId: number;
  outputs: AddActionOutputOption[];
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
      precedence: "Normal" as OutputActionPrecedence,
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
          values.precedence,
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
        await queryClient.invalidateQueries({
          queryKey: ["outputs"],
        });
      } else {
        await queryClient.invalidateQueries({
          queryKey: ["notificationActions", automationId],
        });
      }
    },
  });

  const selectedOutput = rootOutputs.find(
    (output) => String(output.id) === actionForm.values.outputId,
  );
  const selectedWarning = selectedOutput?.actionWarnings.find(
    (warning) => warning.precedence === actionForm.values.precedence,
  );
  const conflictingAutomations = (selectedWarning?.actions ?? []).filter(
    (action) => action.automationId !== automationId,
  );

  return (
    <form
      onSubmit={actionForm.onSubmit(async (values) => {
        await addActionMutation.mutateAsync(values);
        actionForm.reset();
        actionForm.setFieldValue("actionType", "output");
        actionForm.setFieldValue("outputId", String(rootOutputs[0]?.id ?? ""));
        actionForm.setFieldValue("value", rootOutputs[0]?.isPwm ? 50 : 100);
        actionForm.setFieldValue("precedence", "Normal");
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
                  label: output.name ?? `Output Id: ${output.id}`,
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
              <Select
                label="Precedence"
                data={OUTPUT_ACTION_PRECEDENCE_VALUES.map((precedence) => ({
                  value: precedence,
                  label: precedence,
                }))}
                {...actionForm.getInputProps("precedence")}
              />
              {conflictingAutomations.length > 0 ? (
                <Alert
                  color="yellow"
                  variant="light"
                  title="Potential precedence conflict"
                >
                  <Stack gap={4}>
                    <Text size="sm">
                      {conflictingAutomations.length === 1
                        ? `Another automation also controls ${selectedOutput?.name ?? "this output"} at ${actionForm.values.precedence} precedence.`
                        : `Other automations also control ${selectedOutput?.name ?? "this output"} at ${actionForm.values.precedence} precedence.`}
                    </Text>
                    {conflictingAutomations.map((action) => (
                      <Text key={action.automationId} size="sm">
                        {`- ${action.automationName}`}
                      </Text>
                    ))}
                    <Text size="sm">
                      If both automations request different states, neither
                      action will be applied.
                    </Text>
                  </Stack>
                </Alert>
              ) : null}
              {selectedOutput?.isPwm ? (
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
