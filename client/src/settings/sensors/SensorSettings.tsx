import { Fragment, useEffect, useState } from "react";
import { getSensorsAsync, getSupportedSensorModelsAsync } from "@sproot/sproot-client/src/requests";
import { ISensorBase } from "@sproot/sproot-common/src/sensors/SensorBase";
import { Button, Stack, rem } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import EditTable from "@sproot/sproot-client/src/settings/sensors/EditTable";
import NewSensorModal from "@sproot/sproot-client/src/settings/sensors/NewSensorModal";

export default function SensorSettings() {
  const [
    newSensorModalOpened,
    { open: newSensorModalOpen, close: newSensorModalClose },
  ] = useDisclosure(false);
  const [supportedModels, setSupportedModels] = useState([] as string[]);
  const [sensors, setSensors] = useState({} as Record<string, ISensorBase>);
  const [isStale, setIsStale] = useState(false);
  const [editDisabled, setEditDisabled] = useState(
    {} as Record<string, boolean>,
  );

  const updateData = async () => {
    getSensorsAsync().then((response) => {
      setSensors(response.sensors);
      const newEditDisabled = {} as Record<string, boolean>;
      for (const key in response.sensors) {
        newEditDisabled[key] = false;
      }
      setEditDisabled(newEditDisabled);
    });
    getSupportedSensorModelsAsync().then((response) => {
      setSupportedModels(response.supportedModels);
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
          sensors={sensors}
          supportedModels={supportedModels}
          editDisabled={editDisabled}
          modalOpened={newSensorModalOpened}
          closeModal={newSensorModalClose}
          setSensors={setSensors}
          setEditDisabled={setEditDisabled}
          setIsStale={setIsStale}
        />
        <EditTable
          sensors={sensors}
          supportedModels={supportedModels}
          editDisabled={editDisabled}
          setSensors={setSensors}
          setEditDisabled={setEditDisabled}
          setIsStale={setIsStale}
        />
        <Button size="xl" w={rem(300)} onClick={newSensorModalOpen}>
          Add New
        </Button>
      </Stack>
    </Fragment>
  );
}
