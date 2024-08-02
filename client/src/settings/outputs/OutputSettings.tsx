import { Fragment, useEffect, useState } from "react";
import {
  getOutputsAsync,
  getSupportedOutputModelsAsync,
} from "@sproot/sproot-client/src/requests/requests_v1";
import { Button, Stack, rem } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import EditTable from "@sproot/sproot-client/src/settings/outputs/EditTable";
import { IOutputBase } from "@sproot/sproot-common/src/outputs/IOutputBase";
import NewOutputModal from "@sproot/sproot-client/src/settings/outputs/NewOutputModal";

export interface FormValues {
  id?: number;
  name: string;
  model: string;
  address: string;
  pin?: number;
  isPwm?: boolean;
  isInvertedPwm?: boolean;
}

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
        {import.meta.env["VITE_PRECONFIGURED"] != "true" ? (
          <Fragment>
            <Button
              hiddenFrom="sm"
              size="xl"
              w={rem(300)}
              onClick={newOutputModalOpen}
            >
              Add New
            </Button>
            <Button
              visibleFrom="sm"
              size="xl"
              w={rem(300)}
              onClick={newOutputModalOpen}
            >
              Add New
            </Button>
          </Fragment>
        ) : null}
      </Stack>
    </Fragment>
  );
}
