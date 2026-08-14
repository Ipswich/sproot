import { Code, Group, ScrollArea } from "@mantine/core";
import { LinksGroup } from "./NavbarLinksGroup";
// import { Logo } from './Logo';
import classes from "./css/NavbarContents.module.css";
import { Page } from "../Pages";
import { useState } from "react";
import ColorToggle from "../../ColorToggle";

interface NavbarContentsProps {
  closeNavbar: () => void;
  pages: Page[];
}

export default function NavbarContents({
  closeNavbar: closeNavbar,
  pages,
}: NavbarContentsProps) {
  const [openedLinkGroups, setOpenedLinkGroups] = useState([] as string[]);
  const links = pages.map((item: Page) => (
    <LinksGroup
      page={item}
      navLinkText={item.navLinkText}
      icon={item.icon}
      closeNavbar={closeNavbar}
      key={item.navLinkText}
      openedLinkGroups={openedLinkGroups}
      setOpenedLinkGroups={setOpenedLinkGroups}
    />
  ));

  return (
    <nav className={classes["navbar"]!}>
      <div className={classes["header"]}>
        <Group justify="space-between">
          {/* <Logo style={{ width: rem(120) }} /> */}
          <h1>Sproot</h1>
        </Group>
      </div>

      <ScrollArea className={classes["links"]!}>
        <div className={classes["linksInner"]}>{links}</div>
      </ScrollArea>

      <div className={classes["footer"]}>
        <Group justify="space-between" align="center" wrap="nowrap">
          {/* <Stack gap={0}>
            <Text size="sm" fw={500}>
              Appearance
            </Text>
            <Text size="xs" c="dimmed">
              Toggle light or dark theme
            </Text>
          </Stack> */}
          <ColorToggle />
          <Code fw={700}>{import.meta.env["VITE_VERSION"]}</Code>
        </Group>
      </div>
    </nav>
  );
}
