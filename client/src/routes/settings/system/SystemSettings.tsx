import { useMutation, useQuery } from "@tanstack/react-query";
import { powerOffAsync, pingAsync } from "../../../requests/requests_v2";
import { Fragment } from "react/jsx-runtime";
import { Stack, Button, Modal, Group, Loader, rem } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useEffect, useState } from "react";

export default function SystemSettings() {
  const [serverIsOnline, setServerIsOnline] = useState(true);
  const powerOffQuery = useMutation({
    mutationFn: () => {
      return powerOffAsync();
    },
  });

  const pingQuery = useQuery({
    queryKey: ["ping"],
    queryFn: () => {
      return pingAsync();
    },
  });

  const updateServerStatusAsync = async () => {
    const response = await pingQuery.refetch();
    setServerIsOnline(response.data!);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      updateServerStatusAsync();
    }, 2000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [
    confirmModalOpened,
    { open: openConfirmModal, close: closeConfirmModal },
  ] = useDisclosure(false);

  return (
    <Fragment>
      <Stack h="600" justify="center" align="center">
        {!serverIsOnline ? (
          <Modal
            overlayProps={{
              backgroundOpacity: 0.55,
              blur: 3,
            }}
            centered
            size="xs"
            opened={true}
            onClose={() => {
              pingQuery.refetch();
            }}
            withCloseButton={false}
          >
            <Stack justify="center" style={{ textAlign: "center" }}>
              <h2>Server is offline</h2>
              {/* <br/> */}
              <Group justify="center">
                <Loader color="teal" type="bars" />
              </Group>
              <h5>(This will disappear when we're back!) </h5>
            </Stack>
          </Modal>
        ) : (
          <Button
            size="xl"
            w={rem(300)}
            onClick={() => {
              openConfirmModal();
            }}
          >
            Restart System
          </Button>
        )}

        <Modal
          overlayProps={{
            backgroundOpacity: 0.55,
            blur: 3,
          }}
          centered
          size="xs"
          opened={confirmModalOpened}
          onClose={closeConfirmModal}
          title="Restart System?"
        >
          <Group justify="space-between">
            <Button onClick={closeConfirmModal}>Cancel</Button>
            <Button
              color="red"
              loading={powerOffQuery.isPending}
              onClick={() => {
                closeConfirmModal();
                powerOffQuery.mutate();
              }}
            >
              Confirm
            </Button>
          </Group>
        </Modal>
      </Stack>
    </Fragment>
  );
}
