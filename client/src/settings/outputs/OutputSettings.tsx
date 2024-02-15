import { Fragment, useEffect, useState } from "react";
import { getOutputsAsync, getSupportedOutputModelsAsync } from "../../requests";
import { Button, Stack } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import EditTable from "./EditTable";
import { IOutputBase } from "@sproot/src/outputs/OutputBase";
import NewOutputModal from "./NewOutputModal";

export default function OutputSettings() {
  const [
    newOutputModalOpened,
    { open: newOutputModalOpen, close: newOutputModalClose },
  ] = useDisclosure(false);
  const [supportedModels, setSupportedModels] = useState([] as string[]);
  const [outputs, setOutputs] = useState({} as Record<string, IOutputBase>);
  const [isStale, setIsStale] = useState(false);
  const [editDisabled, setEditDisabled] = useState(
    {} as Record<string, boolean>,
  );

  const updateData = async () => {
    getOutputsAsync().then((response) => {
      setOutputs(response.outputs);
      console.log(response.outputs);
      const newEditDisabled = {} as Record<string, boolean>;
      for (const key in response.outputs) {
        newEditDisabled[key] = false;
      }
      setEditDisabled(newEditDisabled);
    });
    getSupportedOutputModelsAsync().then((response) => {
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
        <NewOutputModal
          outputs={outputs}
          supportedModels={supportedModels}
          editDisabled={editDisabled}
          modalOpened={newOutputModalOpened}
          closeModal={newOutputModalClose}
          setOutputs={setOutputs}
          setEditDisabled={setEditDisabled}
          setIsStale={setIsStale}
        />
        <EditTable
          outputs={outputs}
          supportedModels={supportedModels}
          editDisabled={editDisabled}
          setOutputs={setOutputs}
          setEditDisabled={setEditDisabled}
          setIsStale={setIsStale}
        />
        <Button size="xl" fullWidth onClick={newOutputModalOpen}>
          Add New
        </Button>
      </Stack>
    </Fragment>
  );
}
