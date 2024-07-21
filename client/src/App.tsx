import { useState } from "react";
import { MantineProvider, AppShell } from "@mantine/core";
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
const homePage = pages.pages[0]!;

function App() {
  const [currentPage, setCurrentPage] = useState(homePage);
  const [isNavbarOpened, setIsNavbarOpened] = useState(false);

  function toggleNavbar() {
    setIsNavbarOpened(!isNavbarOpened);
  }

  function closeNavbar() {
    if (isNavbarOpened) {
      setIsNavbarOpened(false);
    }
  }

  return (
    <MantineProvider>
      <AppShell
        navbar={{
          width: 250,
          breakpoint: "sm",
          collapsed: { mobile: !isNavbarOpened },
        }}
        header={{
          height: 73,
        }}
        padding="xs"
      >
        <AppShell.Header>
          <HeaderContents
            currentPage={currentPage}
            navbarToggle={toggleNavbar}
            navbarOpened={isNavbarOpened}
          />
        </AppShell.Header>
        <AppShell.Navbar
          style={{ width: "250px", opacity: "95%", zIndex: 202 }}
          p="md"
        >
          <NavbarContents
            setCurrentPage={(view) => {
              closeNavbar();
              setCurrentPage(view);
            }}
          />
        </AppShell.Navbar>
        <AppShell.Main style={{ padding: "0 auto" }}>
          <>
            <div onClick={closeNavbar}>
              {currentPage.navLinkText === "Current Conditions" ? (
                <SensorCarouselContainer />
              ) : currentPage.navLinkText === "Output States" ? (
                <OutputStates />
              ) : currentPage.navLinkText ===
                "Automatic" ? undefined : currentPage.navLinkText ===
                "Triggers" ? undefined : currentPage.navLinkText ===
                "Sensors" ? (
                <SensorSettings />
              ) : currentPage.navLinkText === "Outputs" ? (
                <OutputSettings />
              ) : currentPage.navLinkText === "System" ? undefined : undefined}
            </div>
            {/* <ColorToggle /> */}
          </>
        </AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}

export default App;
