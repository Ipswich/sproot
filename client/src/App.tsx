import { Fragment, useEffect, useState } from "react";
import { MantineProvider, AppShell } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
// All packages except `@mantine/hooks` require styles imports
import "@mantine/core/styles.css";
// import classes from "./App.module.css";
import OutputCard from "./OutputCard";

import SensorCarouselContainer from "./sensors/SensorCarouselContainer";
import { getOutputsAsync } from "./requests";
import { IOutputBase } from "@sproot/sproot-common/src/outputs/OutputBase";
import NavbarContents from "./shell/navbar/NavbarContents";
import HeaderContents from "./shell/header/HeaderContents";
import SensorSettings from "./settings/sensors/SensorSettings";

import { Pages } from "./shell/Pages";

const pages = new Pages();
const homePage = pages.pages[1]!;

function App() {
  const [currentPage, setCurrentPage] = useState(homePage);
  const [navbarOpened, { toggle, close }] = useDisclosure();
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
        padding="xs"
      >
        <AppShell.Header>
          <HeaderContents
            currentPage={currentPage}
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
            setCurrentPage={(view) => {
              close();
              setCurrentPage(view);
            }}
          />
        </AppShell.Navbar>
        <AppShell.Main style={{padding: "0 auto"}} >
          <>
            <div onClick={close}>
              {currentPage.navLinkText === "Current Conditions" ? (
                <SensorCarouselContainer />
              ) : currentPage.navLinkText === "Output States" && outputs ? (
                <Fragment>
                  {Object.keys(outputs).map((key) => (
                    <OutputCard
                      key={"OutputCard-" + outputs[key]?.id}
                      output={outputs[key]!}
                      updateOutputsAsync={updateOutputsAsync}
                    />
                  ))}
                </Fragment>
              ) : currentPage.navLinkText === "Schedule" ? undefined : currentPage.navLinkText ===
                "Triggers" ? undefined : currentPage.navLinkText === "Sensors" ? (
                <SensorSettings />
              ) : currentPage.navLinkText === "Outputs" ? undefined : currentPage.navLinkText ===
                "System" ? undefined : undefined}
            </div>
          </>
        </AppShell.Main>
        
      </AppShell>
    </MantineProvider>
  );
}

export default App;
