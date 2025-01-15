import { Outlet, useLoaderData } from "react-router-dom";
import { MantineProvider, AppShell } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
// All packages except `@mantine/hooks` require styles imports
import "@mantine/core/styles.css";

import { getNavbarItems } from "../shell/Pages";
import HeaderContents from "../shell/header/HeaderContents";
import NavbarContents from "../shell/navbar/NavbarContents";

import { ReadingType } from "@sproot/sproot-common/dist/sensors/ReadingType";
import { IOutputBase } from "@sproot/outputs/IOutputBase";

export default function Root() {
  const loaderData = useLoaderData() as {
    readingTypes: Partial<Record<ReadingType, string>>;
    outputs: Record<string, IOutputBase>;
  };

  const readingTypes = Object.keys(
    loaderData.readingTypes as Partial<Record<ReadingType, string>>,
  ) as ReadingType[];
  const outputs = Object.values(loaderData.outputs);
  const navbarItems = getNavbarItems(readingTypes, outputs);
  const pages = Object.values(navbarItems);
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
            navbarToggle={setIsNavbarOpened.toggle}
            navbarOpened={isNavbarOpened}
            navbarItems={navbarItems}
          />
        </AppShell.Header>
        <AppShell.Navbar style={{ width: "250px", opacity: "95%" }} p="md">
          <NavbarContents
            closeNavbar={() => {
              closeNavbar();
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
