import { useState } from "react";
import { Outlet, useLoaderData, useLocation } from "react-router-dom";
import { MantineProvider, AppShell } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
// All packages except `@mantine/hooks` require styles imports
import "@mantine/core/styles.css";

import { getNavbarItems } from "../shell/Pages";
import HeaderContents from "../shell/header/HeaderContents";
import NavbarContents from "../shell/navbar/NavbarContents";

import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType";

export default function Root() {
  const location = useLocation();
  const readingTypes = Object.keys(
    useLoaderData() as Partial<Record<ReadingType, string>>,
  ) as ReadingType[];
  const pages = Object.values(getNavbarItems(readingTypes));
  const allPages = Object.values(getNavbarItems(readingTypes)).flatMap(
    (page) => {
      if (page.links) {
        return [page, ...page.links];
      }
      return [page];
    },
  );
  const [currentPage, setCurrentPage] = useState(
    allPages.filter((page) => page.href === location.pathname)[0],
  );
  const [isNavbarOpened, setIsNavbarOpened] = useDisclosure(false);

  function closeNavbar() {
    setIsNavbarOpened.close();
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
            headerText={currentPage!.headerText}
            navbarToggle={setIsNavbarOpened.toggle}
            navbarOpened={isNavbarOpened}
          />
        </AppShell.Header>
        <AppShell.Navbar
          style={{ width: "250px", opacity: "95%" }}
          p="md"
        >
          <NavbarContents
            setCurrentPage={(view) => {
              closeNavbar();
              setCurrentPage(view);
            }}
            pages={pages}
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
