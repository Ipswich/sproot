import { Fragment, useState } from "react";
import { Button, Stack, rem } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";

import { getAutomationsAsync } from "../../requests/requests_v2";
import EditablesTable from "../common/EditablesTable";
import { IAutomation } from "@sproot/automation/IAutomation";
import EditAutomationModal from "./EditAutomationModal";

export default function Automations() {
  const [editingAutomation, setEditingAutomation] = useState<IAutomation | null>(null);

  const getAutomationsQuery = useQuery({
    queryKey: ["automations"],
    queryFn: () => getAutomationsAsync(),
  });

  const [
    newAutomationModalOpened,
    { open: newAutomationModalOpen, close: newAutomationModalClose },
  ] = useDisclosure(false);


  return (
    <Fragment>
      <Stack h="600" justify="center" align="center">
        <EditAutomationModal
          modalOpened={newAutomationModalOpened}
          closeModal={newAutomationModalClose}
          existingAutomation={editingAutomation}
        />
        {getAutomationsQuery.isLoading ? <div>Loading...</div> :
          <Fragment>
            <EditablesTable
              editables={getAutomationsQuery.data ?? []}
              onClick={(item) => {
                setEditingAutomation(item as IAutomation);
                newAutomationModalOpen();
              }}
            />
            <Button size="xl" w={rem(300)} onClick={() => {
              setEditingAutomation(null);
              newAutomationModalOpen()
            }}>
              Add New
            </Button>
          </Fragment>
        }
      </Stack>
    </Fragment>
  )
}