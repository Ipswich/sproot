import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SDBOutputAction } from "@sproot/database/SDBOutputAction";
import {
  getOutputActionsByAutomationIdAsync,
  deleteOutputActionAsync,
} from "../../../requests/requests_v2";
import { Group, Text } from "@mantine/core";
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
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["outputActions", automationId],
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

function OutputActionRow(outputAction: SDBOutputAction, output: IOutputBase) {
  return (
    <Group>
      {output?.isPwm
        ? `Set ${output?.name ?? `Output Id: ${output.id}`} to ${String(outputAction.value)}%`
        : `Turn ${output?.name ?? `Output Id: ${output.id}`} ${outputAction.value == 100 ? "On" : "Off"}`}
    </Group>
  );
}
