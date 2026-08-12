import { Fragment, useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Paper,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";
import { IconEdit, IconPlus, IconRefresh } from "@tabler/icons-react";

import {
  getAutomationsAsync,
  getOutputsAsync,
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

  const conflictingAutomationIds = new Set(
    Object.values(getOutputsQuery.data ?? {}).flatMap(
      (output) =>
        output.activeConflict?.actions.map((action) => action.automationId) ??
        [],
    ),
  );
  const automations = [...(getAutomationsQuery.data ?? [])].sort(
    (left, right) =>
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
          onClose={() => {
            getAutomationsQuery.refetch();
            getOutputsQuery.refetch();
          }}
        />
        <EditAutomationModal
          modalOpened={editAutomationModalOpened}
          closeModal={editAutomationModalClose}
          editAutomation={editAutomation}
          setTargetAutomation={setEditAutomation}
          onClose={() => {
            getAutomationsQuery.refetch();
            getOutputsQuery.refetch();
          }}
        />
        <Paper withBorder shadow="xs" radius="lg" p="lg">
          <Group justify="space-between" align="center" gap="md" wrap="wrap">
            <Box>
              <Text fw={600}>Automation Library</Text>
              <Text size="sm" c="dimmed">
                Review automations, enable or disable them, and add new
                conditions and actions.
              </Text>
            </Box>
            <Group gap="xs">
              <Button
                leftSection={<IconPlus size={18} />}
                onClick={() => {
                  setEditAutomation(null);
                  editAutomationModal();
                }}
              >
                Add Automation
              </Button>
              <ActionIcon
                size="lg"
                variant="light"
                onClick={() =>
                  Promise.all([
                    getAutomationsQuery.refetch(),
                    getOutputsQuery.refetch(),
                  ])
                }
                disabled={
                  getAutomationsQuery.isLoading || getOutputsQuery.isLoading
                }
              >
                <IconRefresh size={16} />
              </ActionIcon>
            </Group>
          </Group>
        </Paper>
        {getAutomationsQuery.isLoading ? (
          <div>Loading...</div>
        ) : (
          <Paper withBorder shadow="xs" radius="lg" p="md">
            <Table highlightOnHover style={{ tableLayout: "auto" }}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w="35%" miw={72} ta="center">
                    Status
                  </Table.Th>
                  <Table.Th w="100%" ta="center">
                    Name
                  </Table.Th>
                  <Table.Th w="10%" miw={52} ta="center">
                    Edit
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {automations.map((automation) => {
                  const isConflicting =
                    Boolean(automation.triggered) &&
                    conflictingAutomationIds.has(automation.id);
                  const status = !automation.enabled
                    ? { label: "Disabled", color: "gray" }
                    : isConflicting
                      ? { label: "Conflict", color: "yellow" }
                      : automation.triggered
                        ? { label: "Triggered", color: "green" }
                        : { label: "Idle", color: "blue" };

                  return (
                    <Table.Tr key={automation.id}>
                      <Table.Td ta="center">
                        <Badge variant="light" color={status.color} radius="sm">
                          {status.label}
                        </Badge>
                      </Table.Td>
                      <Table.Td ta="center">
                        <Text
                          fw={400}
                          fz={"sm"}
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
                        <Center>
                          <ActionIcon
                            onClick={() => {
                              setEditAutomation(automation);
                              editAutomationModal();
                            }}
                          >
                            <IconEdit />
                          </ActionIcon>
                        </Center>
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
