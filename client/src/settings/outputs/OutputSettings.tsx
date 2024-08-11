import { Fragment, useEffect, useState } from "react";
import {
  getOutputsAsync,
  getSupportedOutputModelsAsync,
} from "@sproot/sproot-client/src/requests/requests_v2";
import { Button, Stack, rem } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import EditTable from "@sproot/sproot-client/src/settings/outputs/EditTable";
import { IOutputBase } from "@sproot/sproot-common/src/outputs/IOutputBase";
import NewOutputModal from "@sproot/sproot-client/src/settings/outputs/NewOutputModal";
import { useQuery } from "@tanstack/react-query";

export interface FormValues {
  id?: number;
  name: string;
  color: string;
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

  const getOutputsQuery = useQuery({
    queryKey: ["output-settings-outputs"],
    queryFn: () => getOutputsAsync(),
    refetchInterval: 60000,
  });

  const getSupportedModelsQuery = useQuery({
    queryKey: ["output-settings-supported-models"],
    queryFn: () => getSupportedOutputModelsAsync(),
    refetchInterval: 60000,
  });

  const updateData = async () => {
    getOutputsQuery.refetch().then((response) => {
      setOutputs(response.data!);
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
        <NewOutputModal
          supportedModels={supportedModels}
          modalOpened={newOutputModalOpened}
          closeModal={newOutputModalClose}
          setIsStale={setIsStale}
        />
        <EditTable
          outputs={outputs}
          supportedModels={supportedModels}
          setIsStale={setIsStale}
        />
        {import.meta.env["VITE_PRECONFIGURED"] != "true" ? (
          <Fragment>
            <Button size="xl" w={rem(300)} onClick={newOutputModalOpen}>
              Add New
            </Button>
          </Fragment>
        ) : null}
      </Stack>
    </Fragment>
  );
}
