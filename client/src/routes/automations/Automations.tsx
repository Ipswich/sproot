import { Fragment, useState } from "react";
import { Box, Button, Group, Paper, Stack, Switch, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useQuery, useMutation } from "@tanstack/react-query";
import { IconPlus } from "@tabler/icons-react";

import {
  getAutomationsAsync,
  updateAutomationAsync,
} from "../../requests/requests_v2";
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

  const mutateAutomationEnabled = useMutation({
    mutationFn: async (params: { id: number; enabled: boolean }) => {
      await updateAutomationAsync(
        params.id,
        undefined,
        undefined,
        params.enabled,
      );
    },
    onSuccess: () => {
      getAutomationsQuery.refetch();
    },
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
      <Stack gap="lg">
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
        <Paper withBorder shadow="xs" radius="lg" p="lg">
          <Group justify="space-between" align="center" gap="md" wrap="wrap">
            <Box>
              <Text fw={600}>Automation Library</Text>
              <Text size="sm" c="dimmed">
                Review automations, toggle them live, and add new conditions and actions.
              </Text>
            </Box>
            <Button
              leftSection={<IconPlus size={18} />}
              onClick={() => {
                setEditAutomation(null);
                editAutomationModal();
              }}
            >
              Add Automation
            </Button>
          </Group>
        </Paper>
        {getAutomationsQuery.isLoading ? (
          <div>Loading...</div>
        ) : (
          <Paper withBorder shadow="xs" radius="lg" p="md">
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
              tableLeftComponent={{
                label: "Enabled",
                Component: (editable: unknown) => {
                  const automation = editable as IAutomation;
                  return (
                    <Switch
                      checked={automation.enabled}
                      withThumbIndicator={false}
                      onChange={(
                        event: React.ChangeEvent<HTMLInputElement>,
                      ) => {
                        mutateAutomationEnabled.mutate({
                          id: automation.id,
                          enabled: event.currentTarget.checked,
                        });
                      }}
                    />
                  );
                },
              }}
            />
          </Paper>
        )}
      </Stack>
    </Fragment>
  );
}
