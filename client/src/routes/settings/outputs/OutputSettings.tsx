import { Fragment, useEffect, useState } from "react";
import {
  getOutputsAsync,
  getSupportedOutputModelsAsync,
} from "@sproot/sproot-client/src/requests/requests_v2";
import { Button, Stack, rem } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import EditTable from "@sproot/sproot-client/src/routes/settings/outputs/EditTable";
import NewOutputModal from "@sproot/sproot-client/src/routes/settings/outputs/NewOutputModal";
import { useQuery } from "@tanstack/react-query";
import { IOutputBase } from "@sproot/outputs/IOutputBase";
import { Models } from "@sproot/outputs/Models";

export interface OutputFormValues {
  id?: number;
  name: string;
  color: string;
  model: keyof typeof Models;
  subcontrollerId?: number;
  address: string;
  pin: string;
  isPwm: boolean;
  isInvertedPwm: boolean;
  automationTimeout?: number;
}

export default function OutputSettings() {
  const [
    newOutputModalOpened,
    { open: newOutputModalOpen, close: newOutputModalClose },
  ] = useDisclosure(false);
  const [supportedModels, setSupportedModels] = useState(
    {} as Record<string, string>,
  );
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
    await Promise.all([
      getOutputsQuery.refetch().then((response) => {
        setOutputs(response.data!);
      }),
      getSupportedModelsQuery.refetch().then((response) => {
        setSupportedModels(response.data!);
      }),
    ]);
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
        <Button size="xl" w={rem(300)} onClick={newOutputModalOpen}>
          Add New
        </Button>
      </Stack>
    </Fragment>
  );
}
