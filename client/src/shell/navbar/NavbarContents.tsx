import { Group, ScrollArea } from "@mantine/core";
import { LinksGroup } from "./NavbarLinksGroup";
// import { Logo } from './Logo';
import classes from "./css/NavbarContents.module.css";
import { Page } from "../Pages";
import { useState } from "react";

interface NavbarContentsProps {
  setCurrentPage: (page: Page) => void;
  pages: Page[];
}

export default function NavbarContents({
  setCurrentPage,
  pages,
}: NavbarContentsProps) {
  const [openedLinkGroups, setOpenedLinkGroups] = useState([] as string[]);
  const links = pages.map((item: Page) => (
    <LinksGroup
      page={item}
      navLinkText={item.navLinkText}
      icon={item.icon}
      setCurrentPage={setCurrentPage}
      key={item.navLinkText}
      openedLinkGroups={openedLinkGroups}
      setOpenedLinkGroups={setOpenedLinkGroups}
    />
  ));

  return (
    <nav className={classes["navbar"]}>
      <div className={classes["header"]}>
        <Group justify="space-between">
          {/* <Logo style={{ width: rem(120) }} /> */}
          <h1>Sproot</h1>
          <Code fw={700}>{import.meta.env["VITE_VERSION"]}</Code>
        </Group>
      </div>

      <ScrollArea className={classes["links"]!}>
        <div className={classes["linksInner"]}>{links}</div>
      </ScrollArea>

      <div className={classes["footer"]}></div>
    </nav>
  );
}
