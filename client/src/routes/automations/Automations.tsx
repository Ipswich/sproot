import { Fragment, useState } from "react";
import { Button, Stack, rem } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";

import { getAutomationsAsync } from "../../requests/requests_v2";
import EditablesTable from "../common/EditablesTable";
import { IAutomation } from "@sproot/automation/IAutomation";
import EditAutomationModal from "./EditAutomationModal";

export default function Automations() {
  const [viewAutomation, setViewAutomation] = useState<IAutomation | null>(
    null,
  );
  const [editAutomation, setEditAutomation] = useState<IAutomation | null>(
    null,
  );

  const getAutomationsQuery = useQuery({
    queryKey: ["automations"],
    queryFn: () => getAutomationsAsync(),
  });

  const [
    viewAutomationModalOpened,
    { open: viewAutomationModal, close: viewAutomationModalClose },
  ] = useDisclosure(false);

  const [
    editAutomationModalOpened,
    { open: editAutomationModal, close: editAutomationModalClose },
  ] = useDisclosure(false);

  return (
    <Fragment>
      <Stack h="600" justify="center" align="center">
        <EditAutomationModal
          modalOpened={viewAutomationModalOpened}
          closeModal={viewAutomationModalClose}
          editAutomation={viewAutomation}
          setTargetAutomation={setViewAutomation}
          readOnly
        />
        <EditAutomationModal
          modalOpened={editAutomationModalOpened}
          closeModal={editAutomationModalClose}
          editAutomation={editAutomation}
          setTargetAutomation={setEditAutomation}
        />
        {getAutomationsQuery.isLoading ? (
          <div>Loading...</div>
        ) : (
          <Fragment>
            <EditablesTable
              editables={getAutomationsQuery.data ?? []}
              onEditClick={(item) => {
                setEditAutomation(item as IAutomation);
                editAutomationModal();
              }}
              onNameClick={(item) => {
                setViewAutomation(item as IAutomation);
                viewAutomationModal();
              }}
            />
            <Button
              size="xl"
              w={rem(300)}
              onClick={() => {
                setEditAutomation(null);
                editAutomationModal();
              }}
            >
              Add New
            </Button>
          </Fragment>
        )}
      </Stack>
    </Fragment>
  );
}
