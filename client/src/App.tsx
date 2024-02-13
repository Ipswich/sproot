import { Fragment, useEffect, useState } from "react";
import { MantineProvider, AppShell } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
// All packages except `@mantine/hooks` require styles imports
import "@mantine/core/styles.css";
import "./App.css";
import OutputCard from "./OutputCard";

import SensorCarouselContainer from "./sensors/SensorCarouselContainer";
import { getOutputsAsync } from "./requests";
import { IOutputBase } from "@sproot/sproot-common/src/outputs/OutputBase";
import NavbarContents from "./shell/navbar/NavbarContents";
import HeaderContents from "./shell/header/HeaderContents";
import SensorSettings from "./settings/sensors/SensorSettings";

const pages = [
  "Dashboard",
  "Current Conditions",
  "Output States",
  "Schedule",
  "Triggers",
  "Settings",
];
const homePage = pages[1]!;

function App() {
  const [title, setTitle] = useState(homePage);
  const [navbarOpened, { toggle, close }] = useDisclosure();
  const [selectedView, setSelectedView] = useState(homePage);
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
        header={{
          height: 73,
        }}
        padding="md"
      >
        <AppShell.Header>
          <HeaderContents
            title={title}
            navbarToggle={toggle}
            navbarOpened={navbarOpened}
          />
        </AppShell.Header>
        <AppShell.Navbar
          style={{ width: "250px", opacity: "95%", zIndex: 202 }}
          p="md"
        >
          {/* <ColorToggle /> */}
          <NavbarContents
            setView={(view) => {
              close();
              setTitle(view);
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
                  {Object.keys(outputs).map((key) => (
                    <OutputCard
                      key={"OutputCard-" + outputs[key]?.id}
                      output={outputs[key]!}
                      updateOutputsAsync={updateOutputsAsync}
                    />
                  ))}
                </Fragment>
              ) : selectedView === "Schedule" ? undefined : selectedView ===
                "Triggers" ? undefined : selectedView === "Sensors" ? (
                <SensorSettings />
              ) : selectedView === "Outputs" ? undefined : selectedView ===
                "System" ? undefined : undefined}
            </div>
          </>
        </AppShell.Main>
        {/* <AppShell.Footer>
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
        </AppShell.Footer> */}
      </AppShell>
    </MantineProvider>
  );
}

export default App;
