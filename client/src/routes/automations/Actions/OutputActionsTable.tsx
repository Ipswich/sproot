import { useDisclosure } from "@mantine/hooks";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SDBOutputAction } from "@sproot/database/SDBOutputAction";
import {
  getOutputActionsByAutomationIdAsync,
  deleteOutputActionAsync,
} from "../../../requests/requests_v2";
import { Button, Collapse, Group, Space } from "@mantine/core";
import { IOutputBase } from "@sproot/outputs/IOutputBase";
import { Fragment } from "react/jsx-runtime";
import DeletablesTable from "../../common/DeletablesTable";
import NewOutputActionWidget from "./NewOutputActionWidget";

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
  const [addNewOutputActionOpened, { toggle: toggleAddNewOutputAction }] =
    useDisclosure(false);
  const outputActionsQueryFn = useQuery({
    queryKey: ["outputActions"],
    queryFn: () => getOutputActionsByAutomationIdAsync(automationId),
  });

  const deleteOutputActionMutation = useMutation({
    mutationFn: async (outputActionId: number) => {
      await deleteOutputActionAsync(outputActionId);
    },
    onSettled: () => {
      outputActionsQueryFn.refetch();
    },
  });
  return (
    <Fragment>
      {outputActionsQueryFn.isLoading ? (
        <div>Loading...</div>
      ) : (
        <Fragment>
          {Object.keys(outputActionsQueryFn.data ?? {}).length == 0 &&
            readOnly && <div>None</div>}
          <DeletablesTable
            deletables={
              Object.values(outputActionsQueryFn.data ?? {}).map(
                (outputAction) => ({
                  displayLabel: OutputActionRow(
                    outputAction,
                    outputs.find(
                      (output) => output.id == outputAction.outputId,
                    )!,
                  ),
                  id: outputAction.id,
                  deleteFn: (id: number) =>
                    deleteOutputActionMutation.mutateAsync(id),
                }),
              ) || []
            }
            readOnly={readOnly}
          />
        </Fragment>
      )}
      {readOnly ? null : (
        <Fragment>
          <Group justify="center">
            <Button
              size="sm"
              w={"100%"}
              color="green"
              onClick={() => {
                toggleAddNewOutputAction();
              }}
            >
              Add Action
            </Button>
          </Group>
          <Collapse in={addNewOutputActionOpened} transitionDuration={300}>
            <Space h={12} />
            {outputActionsQueryFn.isLoading ? (
              <div>Loading...</div>
            ) : (
              <NewOutputActionWidget
                automationId={automationId}
                outputs={
                  outputs.map((output) => {
                    return {
                      id: output.id,
                      isPwm: output.isPwm,
                      name: output.name ?? "",
                    };
                  }) ?? []
                }
                toggleAddNewOutputAction={toggleAddNewOutputAction}
              />
            )}
          </Collapse>
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
