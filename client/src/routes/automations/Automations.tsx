import { Fragment, useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Paper,
  Stack,
  Switch,
  Table,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useQuery, useMutation } from "@tanstack/react-query";
import { IconEdit, IconPlus } from "@tabler/icons-react";

import {
  getAutomationsAsync,
  getOutputsAsync,
  updateAutomationAsync,
} from "../../requests/requests_v2";
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

  const getOutputsQuery = useQuery({
    queryKey: ["outputs"],
    queryFn: () => getOutputsAsync(),
    refetchInterval: 60000,
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
      getOutputsQuery.refetch();
    },
  });

  const conflictingAutomationIds = new Set(
    Object.values(getOutputsQuery.data ?? {}).flatMap(
      (output) => output.activeConflict?.actions.map((action) => action.automationId) ?? [],
    ),
  );
  const automations = [...(getAutomationsQuery.data ?? [])].sort((left, right) =>
    (left.name || "").localeCompare(right.name || "", undefined, {
      sensitivity: "base",
    }),
  );

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
            <Table highlightOnHover style={{ tableLayout: "fixed" }}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={132} ta="center">Status</Table.Th>
                  <Table.Th ta="center">Name</Table.Th>
                  <Table.Th ta="center">Enabled</Table.Th>
                  <Table.Th ta="center">Edit</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {automations.map((automation) => {
                  const isConflicting =
                    Boolean(automation.triggered) &&
                    conflictingAutomationIds.has(automation.id);
                  const status = !automation.enabled
                    ? { label: "Off", color: "gray" }
                    : isConflicting
                      ? { label: "Conflict", color: "yellow" }
                      : automation.triggered
                        ? { label: "Triggered", color: "green" }
                        : { label: "Idle", color: "gray" };

                  return (
                    <Table.Tr key={automation.id}>
                      <Table.Td ta="center" w={132}>
                        <Badge variant="light" color={status.color} radius="sm">
                          {status.label}
                        </Badge>
                      </Table.Td>
                      <Table.Td ta="center">
                        <Text
                          fw={500}
                          style={{ cursor: "pointer", textAlign: "center" }}
                          onClick={() => {
                            setViewAutomation(automation);
                            viewAutomationModal();
                          }}
                        >
                          {automation.name}
                        </Text>
                      </Table.Td>
                      <Table.Td ta="center">
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
                      </Table.Td>
                      <Table.Td ta="center">
                        <ActionIcon
                          onClick={() => {
                            setEditAutomation(automation);
                            editAutomationModal();
                          }}
                        >
                          <IconEdit />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Paper>
        )}
      </Stack>
    </Fragment>
  );
}
