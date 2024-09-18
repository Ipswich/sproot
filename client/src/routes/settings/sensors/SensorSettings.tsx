import { Fragment, useEffect, useState } from "react";
import {
  getSensorsAsync,
  getSupportedSensorModelsAsync,
} from "@sproot/sproot-client/src/requests/requests_v2";
import { ISensorBase } from "@sproot/sproot-common/src/sensors/ISensorBase";
import { Button, Stack, rem } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import EditTable from "@sproot/sproot-client/src/routes/settings/sensors/EditTable";
import NewSensorModal from "@sproot/sproot-client/src/routes/settings/sensors/NewSensorModal";
import { useQuery } from "@tanstack/react-query";

export default function SensorSettings() {
  const [
    newSensorModalOpened,
    { open: newSensorModalOpen, close: newSensorModalClose },
  ] = useDisclosure(false);
  const [supportedModels, setSupportedModels] = useState([] as string[]);
  const [sensors, setSensors] = useState({} as Record<string, ISensorBase>);
  const [isStale, setIsStale] = useState(false);

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
      <Stack h="600" justify="center" align="center">
        <NewSensorModal
          supportedModels={supportedModels}
          modalOpened={newSensorModalOpened}
          closeModal={newSensorModalClose}
          setIsStale={setIsStale}
        />
        <EditTable
          sensors={sensors}
          supportedModels={supportedModels}
          setIsStale={setIsStale}
        />
        <Button size="xl" w={rem(300)} onClick={newSensorModalOpen}>
          Add New
        </Button>
      </Stack>
    </Fragment>
  );
}
