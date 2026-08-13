import { Fragment, useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Menu,
  Paper,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";
import {
  IconEdit,
  IconPlus,
  IconRefresh,
  IconSortAscending,
  IconSortDescending,
} from "@tabler/icons-react";

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
  const [sortBy, setSortBy] = useState<"name" | "id" | "status">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

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
  const statusOf = (automation: IAutomation) => {
    const isConflicting =
      Boolean(automation.triggered) &&
      conflictingAutomationIds.has(automation.id);

    if (!automation.enabled)
      return { label: "Disabled", color: "gray", rank: 0 };
    if (isConflicting) return { label: "Conflict", color: "yellow", rank: 3 };
    if (automation.triggered)
      return { label: "Triggered", color: "green", rank: 2 };
    return { label: "Idle", color: "blue", rank: 1 };
  };

  const automations = [...(getAutomationsQuery.data ?? [])].sort(
    (left, right) => {
      const dir = sortDir === "asc" ? 1 : -1;

      if (sortBy === "id") {
        return ((left.id ?? 0) - (right.id ?? 0)) * dir;
      }

      if (sortBy === "status") {
        return (statusOf(left).rank - statusOf(right).rank) * dir;
      }

      return (
        (left.name || "").localeCompare(right.name || "", undefined, {
          sensitivity: "base",
        }) * dir
      );
    },
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
                variant="light"
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
              <Menu withinPortal={false} position="bottom-end">
                <Menu.Target>
                  <ActionIcon size="lg" variant="light">
                    {sortDir === "asc" ? (
                      <IconSortAscending size={16} />
                    ) : (
                      <IconSortDescending size={16} />
                    )}
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    onClick={() => {
                      if (sortBy === "name") {
                        setSortDir((current) =>
                          current === "asc" ? "desc" : "asc",
                        );
                      } else {
                        setSortBy("name");
                        setSortDir("asc");
                      }
                    }}
                  >
                    Name{" "}
                    {sortBy === "name"
                      ? sortDir === "asc"
                        ? " ↑"
                        : " ↓"
                      : null}
                  </Menu.Item>
                  <Menu.Item
                    onClick={() => {
                      if (sortBy === "id") {
                        setSortDir((current) =>
                          current === "asc" ? "desc" : "asc",
                        );
                      } else {
                        setSortBy("id");
                        setSortDir("desc");
                      }
                    }}
                  >
                    Create Date{" "}
                    {sortBy === "id" ? (sortDir === "asc" ? " ↑" : " ↓") : null}
                  </Menu.Item>
                  <Menu.Item
                    onClick={() => {
                      if (sortBy === "status") {
                        setSortDir((current) =>
                          current === "asc" ? "desc" : "asc",
                        );
                      } else {
                        setSortBy("status");
                        setSortDir("desc");
                      }
                    }}
                  >
                    Status{" "}
                    {sortBy === "status"
                      ? sortDir === "asc"
                        ? " ↑"
                        : " ↓"
                      : null}
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
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
                  const status = statusOf(automation);

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
                            variant="light"
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
