import { Fragment, useEffect, useState } from "react";
import {
  getOutputsAsync,
  getSupportedOutputModelsAsync,
} from "@sproot/sproot-client/src/requests/requests_v2";
import { Box, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import EditTable from "@sproot/sproot-client/src/routes/settings/outputs/EditTable";
import NewOutputModal from "@sproot/sproot-client/src/routes/settings/outputs/NewOutputModal";
import { useQuery } from "@tanstack/react-query";
import { IOutputBase } from "@sproot/outputs/IOutputBase";
import { Models } from "@sproot/outputs/Models";
import {
  IconMapPin,
  IconPlus,
  IconSortAscending,
  IconSortDescending,
} from "@tabler/icons-react";
import { ActionIcon, Menu } from "@mantine/core";
import DeviceZonesModal from "../shared/DeviceZonesModal";

export interface OutputFormValues {
  id?: number;
  name: string;
  color: string;
  model: keyof typeof Models;
  subcontrollerId?: number;
  address: string;
  deviceZoneId?: number;
  pin: string;
  isPwm: boolean;
  isInvertedPwm: boolean;
  automationTimeout?: number;
  groupedOutputIds?: number[];
}

export default function OutputSettings() {
  const [
    newOutputModalOpened,
    { open: newOutputModalOpen, close: newOutputModalClose },
  ] = useDisclosure(false);
  const [supportedModels, setSupportedModels] = useState(
    {} as Record<string, string>,
  );
  const [
    deviceZonesModalOpened,
    { open: deviceZonesModalOpen, close: deviceZonesModalClose },
  ] = useDisclosure(false);
  const [outputs, setOutputs] = useState({} as Record<string, IOutputBase>);
  const [isStale, setIsStale] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "id">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const getOutputsQuery = useQuery({
    queryKey: ["output-settings-outputs"],
    queryFn: () => getOutputsAsync(),
    refetchInterval: 60000,
  });

  const getSupportedModelsQuery = useQuery({
    queryKey: ["output-settings-supported-models"],
    queryFn: () => getSupportedOutputModelsAsync(),
    refetchInterval: 60000,
  });

  const updateData = async () => {
    await Promise.all([
      getOutputsQuery.refetch().then((response) => {
        setOutputs(response.data!);
      }),
      getSupportedModelsQuery.refetch().then((response) => {
        setSupportedModels(response.data!);
      }),
    ]);
  };

  useEffect(() => {
    updateData();
    setIsStale(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStale]);

  return (
    <Fragment>
      <Stack gap="lg">
        <DeviceZonesModal
          modalOpened={deviceZonesModalOpened}
          closeModal={deviceZonesModalClose}
        />
        <NewOutputModal
          supportedModels={supportedModels}
          modalOpened={newOutputModalOpened}
          closeModal={newOutputModalClose}
          setIsStale={setIsStale}
        />
        <Paper withBorder shadow="xs" radius="lg" p="lg">
          <Group justify="space-between" align="center" gap="md" wrap="wrap">
            <Box>
              <Text fw={600}>Output Configuration</Text>
              <Text size="sm" c="dimmed">
                Manage your output hardware configuration and zone organization.
              </Text>
            </Box>
            <Group gap="sm">
              <Button
                variant="default"
                leftSection={<IconMapPin size={18} />}
                onClick={deviceZonesModalOpen}
              >
                Manage Zones
              </Button>
              <Button
                variant="light"
                leftSection={<IconPlus size={18} />}
                onClick={newOutputModalOpen}
              >
                Add Output
              </Button>
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
                </Menu.Dropdown>
              </Menu>
            </Group>
          </Group>
        </Paper>
        <Paper withBorder shadow="xs" radius="lg" p="md">
          <EditTable
            outputs={outputs}
            supportedModels={supportedModels}
            setIsStale={setIsStale}
            sortBy={sortBy}
            sortDir={sortDir}
          />
        </Paper>
      </Stack>
    </Fragment>
  );
}
