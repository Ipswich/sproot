import { useDisclosure } from "@mantine/hooks";
import { useQuery, useMutation } from "@tanstack/react-query";
import DeletablesTable from "../../common/DeletablesTable";
import { SDBOutputAction } from "@sproot/database/SDBOutputAction";
import { getOutputActionsAsync, deleteOutputActionAsync, getOutputsAsync } from "../../../requests/requests_v2";


export interface OutputActionsTableProps {
  automationId: number;
}

export default function OutputActionsTable({ automationId }: OutputActionsTableProps) {
  const [addNewOutputActionOpened, { toggle: toggleAddNewOutputAction }] = useDisclosure(false);
  const outputActionsQueryFn = useQuery({
    queryKey: ["outputActions"],
    queryFn: () => getOutputActionsAsync(automationId),
  })

  const outputsQueryFn = useQuery({
    queryKey: ["outputs"],
    queryFn: () => getOutputsAsync(),
  });

  console.log(outputActionsQueryFn.data);
  const deleteOutputActionMutation = useMutation({
    mutationFn: async (outputActionId: number) => {
    await deleteOutputActionAsync(automationId, outputActionId);
    },
    onSettled: () => {
      outputActionsQueryFn.refetch();
    },
  });

  //local helper function
  function mapToDeleteOutputActionMutationAsync(outputAction: SDBOutputAction): (id: number) => Promise<void> {
    return async (outputActionId: number) => {
      await deleteOutputActionMutation.mutateAsync(outputActionId);
    };
  }

  return (
    <DeletablesTable
      deletableName="Output Action"
      deletables={outputActionsQueryFn.data?.map((outputAction) => ({
        displayLabel: outputAction.outputName,
        id: outputAction.id,
        deleteFn: mapToDeleteOutputActionMutationAsync(outputAction),
      })) || []}
    />
  );

}