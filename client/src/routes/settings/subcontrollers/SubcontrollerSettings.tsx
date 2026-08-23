import { Suspense, lazy, useEffect, useState } from "react";
import { getSubcontrollerAsync } from "@sproot/sproot-client/src/requests/requests_v2";
import {
  ActionIcon,
  Box,
  Button,
  Group,
  Loader,
  Menu,
  Paper,
  Stack,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import EditTable from "@sproot/sproot-client/src/routes/settings/subcontrollers/EditTable";
import { useQuery } from "@tanstack/react-query";
import NewSubcontrollerModal from "./NewSubcontrollerModal";
import { ISubcontroller } from "@sproot/system/ISubcontroller";
import {
  IconPlus,
  IconSortAscending,
  IconSortDescending,
} from "@tabler/icons-react";

const FlashSubcontroller = lazy(() => import("./FlashSubcontroller"));

export default function SubcontrollerSettings() {
  const [
    newSubcontrollerModalOpened,
    { open: newSubcontrollerModalOpen, close: newSubcontrollerModalClose },
  ] = useDisclosure(false);

  const [subcontrollers, setSubcontrollers] = useState([] as ISubcontroller[]);
  const [isStale, setIsStale] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "id">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const subcontrollerQuery = useQuery({
    queryKey: ["subcontrollers"],
    queryFn: async () => {
      return await getSubcontrollerAsync();
    },
    refetchInterval: 60000,
  });

  const updateData = async () => {
    await subcontrollerQuery.refetch().then((response) => {
      setSubcontrollers(
        response.data?.recognized.map((sdb) => {
          return {
            hostName: sdb.hostName,
            id: sdb.id,
            name: sdb.name,
          };
        }) ?? [],
      );
    });
  };

  useEffect(() => {
    updateData();
    setIsStale(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStale]);

  return (
    <Stack gap="lg">
      {subcontrollerQuery.isSuccess && (
        <NewSubcontrollerModal
          devices={subcontrollerQuery.data?.unrecognized}
          modalOpened={newSubcontrollerModalOpened}
          closeModal={newSubcontrollerModalClose}
          setIsStale={setIsStale}
        />
      )}
      <Paper withBorder shadow="xs" radius="lg" p="lg">
        <Group justify="space-between" align="center" gap="md" wrap="wrap">
          <Box>
            <Text fw={600}>Subcontroller Configuration</Text>
            <Text size="sm" c="dimmed">
              Connect subcontrollers, rename them, and manage firmware from one
              place.
            </Text>
          </Box>
          <Group gap="sm">
            <Button
              variant="light"
              leftSection={<IconPlus size={18} />}
              onClick={newSubcontrollerModalOpen}
            >
              Connect
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
                  {sortBy === "name" ? (sortDir === "asc" ? " ↑" : " ↓") : null}
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
          subcontrollers={subcontrollers}
          setIsStale={setIsStale}
          sortBy={sortBy}
          sortDir={sortDir}
        />
      </Paper>
      <Group justify="space-between" align="center" gap="md" wrap="wrap">
        <Suspense fallback={<Loader color="teal" type="bars" size="sm" />}>
          <FlashSubcontroller />
        </Suspense>
      </Group>
    </Stack>
  );
}
