import { Fragment, useEffect, useState } from "react";
import { Button, Stack, rem } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";

import { getAutomationsAsync } from "../../requests/requests_v2";
import EditablesTable from "../common/EditablesTable";
import { IAutomation } from "@sproot/automation/IAutomation";
import EditAutomationModal from "./EditAutomationModal";

export default function Automations() {
  const [automations, setAutomations] = useState([] as IAutomation[]);
  const [editingAutomation, setEditingAutomation] = useState<IAutomation | null>(null);
  const [isStale, setIsStale] = useState(false);

  const getAutomationsQuery = useQuery({
    queryKey: ["automations"],
    queryFn: () => getAutomationsAsync(),
  });

  const [
    newAutomationModalOpened,
    { open: newAutomationModalOpen, close: newAutomationModalClose },
  ] = useDisclosure(false);

  const updateData = async () => {
    getAutomationsQuery.refetch().then((response) => {
      setAutomations(response.data!);
    });
  };

  useEffect(() => {
    updateData();
    setIsStale(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStale]);

  return (
    <Fragment>
      <Stack h="600" justify="center" align="center">
        <EditAutomationModal
          modalOpened={newAutomationModalOpened}
          closeModal={newAutomationModalClose}
          setAutomationsAsStale={setIsStale}
          existingAutomation={editingAutomation}
        />
        <EditablesTable
          editables={automations}
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
      </Stack>
    </Fragment>
  )
}