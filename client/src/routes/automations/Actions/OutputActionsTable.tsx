import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SDBOutputAction } from "@sproot/database/SDBOutputAction";
import {
  getOutputActionsByAutomationIdAsync,
  deleteOutputActionAsync,
} from "../../../requests/requests_v2";
import { Alert, Group, Stack, Text } from "@mantine/core";
import { IOutputBase } from "@sproot/outputs/IOutputBase";
import { Fragment } from "react/jsx-runtime";
import DeletablesTable from "../../common/DeletablesTable";

export interface OutputActionsTableProps {
  automationId: number;
  outputs: IOutputBase[];
  readOnly?: boolean;
}

export default function OutputActionsTable({
  automationId,
  outputs,
  readOnly = false,
}: OutputActionsTableProps) {
  const queryClient = useQueryClient();
  const outputActionsQueryFn = useQuery({
    queryKey: ["outputActions", automationId],
    queryFn: () => getOutputActionsByAutomationIdAsync(automationId),
  });

  const deleteOutputActionMutation = useMutation({
    mutationFn: async (outputActionId: number) => {
      await deleteOutputActionAsync(outputActionId);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["outputActions", automationId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["outputs"],
      });
    },
  });

  const outputActionRows = Object.values(outputActionsQueryFn.data ?? {})
    .filter(
      (outputAction) =>
        outputs.find((output) => output.id == outputAction.outputId)
          ?.parentOutputId === null,
    )
    .map((outputAction) => {
      return {
        displayLabel: OutputActionRow(
          outputAction,
          outputs.find((output) => output.id == outputAction.outputId)!,
          automationId,
        ),
        id: outputAction.id,
        deleteFn: (id: number) => deleteOutputActionMutation.mutateAsync(id),
      };
    });

  return (
    <Fragment>
      {outputActionsQueryFn.isLoading ? (
        <div>Loading...</div>
      ) : (
        <Fragment>
          {outputActionRows.length === 0 ? (
            <Text c="dimmed">None</Text>
          ) : (
            <DeletablesTable
              deletables={outputActionRows}
              readOnly={readOnly}
            />
          )}
        </Fragment>
      )}
    </Fragment>
  );
}

function OutputActionRow(
  outputAction: SDBOutputAction,
  output: IOutputBase,
  automationId: number,
) {
  const matchingWarning = output.actionWarnings.find(
    (warning) => warning.precedence === outputAction.precedence,
  );
  const conflictingAutomations = (matchingWarning?.actions ?? []).filter(
    (action) => action.automationId !== automationId,
  );

  return (
    <Stack gap="xs">
      <Group>
        {output?.isPwm
          ? `Set ${output?.name ?? `Output Id: ${output.id}`} to ${String(outputAction.value)}% at ${outputAction.precedence} precedence`
          : `Turn ${output?.name ?? `Output Id: ${output.id}`} ${outputAction.value == 100 ? "On" : "Off"} at ${outputAction.precedence} precedence`}
      </Group>
      {conflictingAutomations.length > 0 ? (
        <Alert color="yellow" variant="light" title="Potential precedence conflict">
          <Stack gap={4}>
            <Text size="sm">
              {conflictingAutomations.length === 1
                ? `Another automation also controls ${output?.name ?? "this output"} at ${outputAction.precedence} precedence.`
                : `Other automations also control ${output?.name ?? "this output"} at ${outputAction.precedence} precedence.`}
            </Text>
            {conflictingAutomations.map((action) => (
              <Text key={action.automationId} size="sm">
                {`- ${action.automationName}`}
              </Text>
            ))}
            <Text size="sm">
              If both automations request different states, neither action will be applied.
            </Text>
          </Stack>
        </Alert>
      ) : null}
    </Stack>
  );
}
