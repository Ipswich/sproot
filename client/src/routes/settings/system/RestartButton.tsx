import { Button, rem, Modal, Group } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { powerOffAsync } from "../../../requests/requests_v2";
import { useMutation } from "@tanstack/react-query";
import { Fragment } from "react/jsx-runtime";

export default function RestartButton() {
  const powerOffQuery = useMutation({
    mutationFn: () => {
      return powerOffAsync();
    },
  });

  const [
    confirmModalOpened,
    { open: openConfirmModal, close: closeConfirmModal },
  ] = useDisclosure(false);

  return (
    <Fragment>
      <Button
        size="xl"
        w={rem(300)}
        onClick={() => {
          openConfirmModal();
        }}
      >
        Restart
      </Button>

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
          <Button onClick={closeConfirmModal} color="red">
            Cancel
          </Button>
          <Button
            color="grape"
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
    </Fragment>
  );
}
