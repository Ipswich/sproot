import { Suspense } from "react";
import { Outlet, useLoaderData } from "react-router-dom";
import {
  AppShell,
  Center,
  Loader,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
// All packages except `@mantine/hooks` require styles imports
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";

import { getNavbarItems } from "../shell/Pages";
import HeaderContents from "../shell/header/HeaderContents";
import NavbarContents from "../shell/navbar/NavbarContents";

import { ReadingType } from "@sproot/common/sensors/ReadingType";
import { IOutputBase } from "@sproot/outputs/IOutputBase";
import { SDBCameraSettings } from "@sproot/database/SDBCameraSettings";
import AppProviders from "./AppProviders";

export default function Root() {
  const loaderData = useLoaderData() as {
    readingTypes: Partial<Record<ReadingType, string>>;
    outputs: Record<string, IOutputBase>;
    cameraSettings: SDBCameraSettings[];
  };

  const readingTypes = Object.keys(
    loaderData.readingTypes as Partial<Record<ReadingType, string>>,
  ) as ReadingType[];
  const outputs = Object.values(loaderData.outputs);
  const cameraSettings = loaderData.cameraSettings;
  const navbarItems = getNavbarItems(readingTypes, outputs, cameraSettings);
  const pages = Object.values(navbarItems);
  const [isNavbarOpened, setIsNavbarOpened] = useDisclosure(false);

  function closeNavbar() {
    setIsNavbarOpened.close();
  }

  return (
    <AppProviders>
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
          <div
            onClick={(event) => {
              const target = event.target as HTMLElement;
              if (target.closest(".mantine-Burger-root")) {
                return;
              }
              closeNavbar();
            }}
          >
            <HeaderContents
              navbarToggle={setIsNavbarOpened.toggle}
              navbarOpened={isNavbarOpened}
              navbarItems={navbarItems}
            />
          </div>
        </AppShell.Header>
        <AppShell.Navbar
          style={{
            width: "250px",
            opacity: "95%",
            borderInlineEnd: "none",
          }}
        >
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
              <Suspense
                fallback={
                  <Center mih={240}>
                    <Loader color="teal" type="bars" size="lg" />
                  </Center>
                }
              >
                <Outlet />
              </Suspense>
            </div>
          </>
        </AppShell.Main>
      </AppShell>
    </AppProviders>
  );
}
