import { Fragment, useEffect, useState } from "react";
import {
  getSensorsAsync,
  getSupportedSensorModelsAsync,
} from "@sproot/sproot-client/src/requests/requests_v2";
import { ISensorBase } from "@sproot/common/sensors/ISensorBase";
import { Box, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import EditTable from "@sproot/sproot-client/src/routes/settings/sensors/EditTable";
import NewSensorModal from "@sproot/sproot-client/src/routes/settings/sensors/NewSensorModal";
import { useQuery } from "@tanstack/react-query";
import {
  IconMapPin,
  IconPlus,
  IconSortAscending,
  IconSortDescending,
} from "@tabler/icons-react";
import { ActionIcon, Menu } from "@mantine/core";
import DeviceZonesModal from "../shared/DeviceZonesModal";

export default function SensorSettings() {
  const [
    newSensorModalOpened,
    { open: newSensorModalOpen, close: newSensorModalClose },
  ] = useDisclosure(false);
  const [supportedModels, setSupportedModels] = useState(
    {} as Record<string, string>,
  );
  const [
    deviceZonesModalOpened,
    { open: deviceZonesModalOpen, close: deviceZonesModalClose },
  ] = useDisclosure(false);
  const [sensors, setSensors] = useState({} as Record<string, ISensorBase>);
  const [isStale, setIsStale] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "id">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const getSensorsQuery = useQuery({
    queryKey: ["sensor-settings-sensors"],
    queryFn: () => getSensorsAsync(),
    refetchInterval: 60000,
  });

  const getSupportedModelsQuery = useQuery({
    queryKey: ["sensor-settings-supported-models"],
    queryFn: () => getSupportedSensorModelsAsync(),
    refetchInterval: 60000,
  });

  const updateData = async () => {
    getSensorsQuery.refetch().then((response) => {
      setSensors(response.data!);
    });
    getSupportedModelsQuery.refetch().then((response) => {
      setSupportedModels(response.data!);
    });
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
        <NewSensorModal
          supportedModels={supportedModels}
          modalOpened={newSensorModalOpened}
          closeModal={newSensorModalClose}
          setIsStale={setIsStale}
        />
        <Paper withBorder shadow="xs" radius="lg" p="lg">
          <Group justify="space-between" align="center" gap="md" wrap="wrap">
            <Box>
              <Text fw={600}>Sensor Configuration</Text>
              <Text size="sm" c="dimmed">
                Manage your sensor hardware configuration and zone organization.
              </Text>
            </Box>
            <Group gap="xs" justify="flex-start">
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
                onClick={newSensorModalOpen}
              >
                Add Sensor
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
            sensors={sensors}
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
