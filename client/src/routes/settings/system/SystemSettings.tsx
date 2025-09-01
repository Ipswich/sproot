import { Fragment } from "react/jsx-runtime";
import { Stack, Modal, Group, Loader } from "@mantine/core";
import { useEffect, useState } from "react";
import { pingAsync } from "../../../requests/requests_v2";
import { useQuery } from "@tanstack/react-query";
import RestartButton from "./RestartButton";
import SystemStatus from "./Status";

export default function SystemSettings() {
  const [serverIsOnline, setServerIsOnline] = useState(true);
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

  return (
    <Fragment>
      <Stack h="600" align="center">
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
          <Fragment>
            <SystemStatus />
            <RestartButton />
          </Fragment>
        )}
      </Stack>
    </Fragment>
  );
}
