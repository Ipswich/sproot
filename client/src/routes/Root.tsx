import { useState } from "react";
import { MantineProvider, AppShell } from "@mantine/core";
// All packages except `@mantine/hooks` require styles imports
import "@mantine/core/styles.css";

import NavbarContents from "../shell/navbar/NavbarContents";
import HeaderContents from "../shell/header/HeaderContents";

import { Pages } from "@sproot/sproot-client/src/shell/Pages";
import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType";
import { Outlet, useLoaderData } from "react-router-dom";

const pages = new Pages();
const homePage = pages.pages[0]!;

export default function Root() {
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
            readingTypes={Object.keys(useLoaderData() as Partial<Record<ReadingType, string>>) as ReadingType[]}
          />
        </AppShell.Navbar>
        <AppShell.Main style={{ padding: "0 auto" }}>
          <>
            <div onClick={closeNavbar}>
              <Outlet />
            </div>
          </>
        </AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}
