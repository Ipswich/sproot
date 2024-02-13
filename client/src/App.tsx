import { Fragment, useEffect, useState } from "react";
import {
  MantineProvider,
  AppShell,
  Burger,
  Flex,
  ActionIcon,
} from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
// All packages except `@mantine/hooks` require styles imports
import "@mantine/core/styles.css";
import "./App.css";
import OutputCard from "./OutputCard";

import SensorCarouselContainer from "./sensors/SensorCarouselContainer";
import { getOutputsAsync } from "./requests";
import { IOutputBase } from "@sproot/sproot-common/src/outputs/OutputBase";
import NavbarContents from "./shell/navbar/NavbarContents";
import SensorSettings from "./settings/sensors/SensorSettings";

function App() {
  const [navbarOpened, { toggle, close }] = useDisclosure();
  const [selectedView, setSelectedView] = useState("Sensors"); // ["Dashboard", "Current Conditions", "Output States", "Schedule", "Triggers", "Settings"
  const [outputs, setOutputs] = useState({} as Record<string, IOutputBase>);

  useEffect(() => {
    updateOutputsAsync();
    const interval = setInterval(async () => {
      updateOutputsAsync();
    }, 300000);

    return () => clearInterval(interval);
  }, []);

  const updateOutputsAsync = async () => {
    setOutputs((await getOutputsAsync()).outputs);
  };

  return (
    <MantineProvider>
      <AppShell
        navbar={{
          width: 250,
          breakpoint: "sm",
          collapsed: { mobile: !navbarOpened },
        }}
        padding="md"
      >
        <AppShell.Navbar
          style={{ width: "250px", opacity: "95%", zIndex: 202 }}
          p="md"
        >
          <Flex align="center" justify="flex-end">
            <ActionIcon
              color="black"
              variant="transparent"
              onClick={close}
              title="Close"
              style={{ position: "absolute", right: 16, top: 16 }}
              hiddenFrom="sm"
            >
              <IconX />
            </ActionIcon>
          </Flex>
          {/* <ColorToggle /> */}
          <NavbarContents
            setView={(view) => {
              close();
              return setSelectedView(view);
            }}
          />
        </AppShell.Navbar>
        <AppShell.Main>
          <>
            <div onClick={close}>
              {selectedView === "Current Conditions" ? (
                <SensorCarouselContainer />
              ) : selectedView === "Output States" && outputs ? (
                <Fragment>
                  <h1>Output States</h1>
                  {Object.keys(outputs).map((key) => (
                    <OutputCard
                      key={"OutputCard-" + outputs[key]?.id}
                      output={outputs[key]!}
                      updateOutputsAsync={updateOutputsAsync}
                    />
                  ))}
                </Fragment>
              ) : selectedView === "Schedule" ? (
                <h1>Schedule</h1>
              ) : selectedView === "Triggers" ? (
                <h1>Triggers</h1>
              ) : selectedView === "Sensors" ? (
                <SensorSettings />
              ) : selectedView === "Outputs" ? (
                <h1>Settings - Outputs</h1>
              ) : selectedView === "System" ? (
                <h1>Settings - System</h1>
              ) : (
                <h1>Dashboard</h1>
              )}
            </div>
          </>
        </AppShell.Main>
        <AppShell.Footer>
          <Flex
            onClick={toggle}
            align="center"
            justify="flex-end"
            style={{
              cursor: "pointer",
              position: "absolute",
              zIndex: 201,
              right: 12,
              bottom: 12,
              borderRadius: "60px",
              background: "var(--mantine-color-blue-filled",
            }}
          >
            <Burger
              color="white"
              opened={navbarOpened}
              size="32px"
              hiddenFrom="sm"
              style={{ margin: "10px" }}
            />
          </Flex>
        </AppShell.Footer>
      </AppShell>
    </MantineProvider>
  );
}

export default App;
