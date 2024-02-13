import { Fragment, useEffect, useState } from "react";
import { getSensorsAsync, getSupportedModelsAsync } from "../../requests";
import { ISensorBase } from "@sproot/src/sensors/SensorBase";
import { Button, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import EditTable from "./EditTable";
import NewSensorModal from "./NewSensorModal";

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
    getSupportedModelsAsync().then((response) => {
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
        <Button size="xl" fullWidth onClick={newSensorModalOpen}>
          Add New
        </Button>
      </Stack>
    </Fragment>
  );
}
