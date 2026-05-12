import { Fragment, useEffect, useState } from "react";
import { getSubcontrollerAsync } from "@sproot/sproot-client/src/requests/requests_v2";
import { Button, Stack, rem } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import EditTable from "@sproot/sproot-client/src/routes/settings/subcontrollers/EditTable";
import { useQuery } from "@tanstack/react-query";
import NewSubcontrollerModal from "./NewSubcontrollerModal";
import { ISubcontroller } from "@sproot/system/ISubcontroller";
import FlashSubcontroller from "./FlashSubcontroller";

export default function SubcontrollerSettings() {
  const [
    newSubcontrollerModalOpened,
    { open: newSubcontrollerModalOpen, close: newSubcontrollerModalClose },
  ] = useDisclosure(false);

  const [subcontrollers, setSubcontrollers] = useState([] as ISubcontroller[]);
  const [isStale, setIsStale] = useState(false);

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
    <Fragment>
      <Stack h="600" justify="center" align="center">
        {subcontrollerQuery.isSuccess && (
          <NewSubcontrollerModal
            devices={subcontrollerQuery.data?.unrecognized}
            modalOpened={newSubcontrollerModalOpened}
            closeModal={newSubcontrollerModalClose}
            setIsStale={setIsStale}
          />
        )}
        <EditTable subcontrollers={subcontrollers} setIsStale={setIsStale} />
        <Fragment>
          <Button size="xl" w={rem(300)} onClick={newSubcontrollerModalOpen}>
            Connect
          </Button>
        </Fragment>
        <FlashSubcontroller />
      </Stack>
    </Fragment>
  );
}
