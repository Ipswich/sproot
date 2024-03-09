import { useState } from "react";
import { MantineProvider, AppShell } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
// All packages except `@mantine/hooks` require styles imports
import "@mantine/core/styles.css";
// import classes from "./App.module.css";

import SensorCarouselContainer from "./sensors/SensorCarouselContainer";
import NavbarContents from "./shell/navbar/NavbarContents";
import HeaderContents from "./shell/header/HeaderContents";
import SensorSettings from "./settings/sensors/SensorSettings";

import { Pages } from "./shell/Pages";
import OutputSettings from "./settings/outputs/OutputSettings";
import OutputStates from "./outputs/OutputStates";

const pages = new Pages();
const homePage = pages.pages[1]!;

function App() {
  const [currentPage, setCurrentPage] = useState(homePage);
  const [navbarOpened, { toggle, close }] = useDisclosure();

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
        <AppShell.Main style={{ padding: "0 auto" }}>
          <>
            <div onClick={close}>
              {currentPage.navLinkText === "Current Conditions" ? (
                <SensorCarouselContainer />
              ) : currentPage.navLinkText === "Output States" ? (
                <OutputStates />
              ) : currentPage.navLinkText ===
                "Schedule" ? undefined : currentPage.navLinkText ===
                "Triggers" ? undefined : currentPage.navLinkText ===
                "Sensors" ? (
                <SensorSettings />
              ) : currentPage.navLinkText === "Outputs" ? (
                <OutputSettings />
              ) : currentPage.navLinkText === "System" ? undefined : undefined}
            </div>
          </>
        </AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}

export default App;
