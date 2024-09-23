import { Fragment, useState } from "react";
import { Button, Stack, rem } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";

import { getAutomationsAsync } from "../../requests/requests_v2";
import EditablesTable from "../common/EditablesTable";
import { IAutomation } from "@sproot/automation/IAutomation";
import EditAutomationModal from "./EditAutomationModal";

export default function Automations() {
  const [targetAutomation, setTargetAutomation] = useState<IAutomation | null>(null);

  const getAutomationsQuery = useQuery({
    queryKey: ["automations"],
    queryFn: () => getAutomationsAsync(),
  });

  const [
    editAutomationModalOpened,
    { open: editAutomationModalOpen, close: editAutomationModalClose },
  ] = useDisclosure(false);

  return (
    <Fragment>
      <Stack h="600" justify="center" align="center">
        <EditAutomationModal
          modalOpened={editAutomationModalOpened}
          closeModal={editAutomationModalClose}
          targetAutomation={targetAutomation}
          setTargetAutomation={setTargetAutomation}
        />
        {getAutomationsQuery.isLoading ? <div>Loading...</div> :
          <Fragment>
            <EditablesTable
              editables={getAutomationsQuery.data ?? []}
              onClick={(item) => {
                setTargetAutomation(item as IAutomation);
                editAutomationModalOpen();
              }}
            />
            <Button size="xl" w={rem(300)} onClick={() => {
              setTargetAutomation(null);
              editAutomationModalOpen()
            }}>
              Add New
            </Button>
          </Fragment>
        }
      </Stack>
    </Fragment>
  )
}