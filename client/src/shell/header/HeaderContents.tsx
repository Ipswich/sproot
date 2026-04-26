import { Box, Burger, Container, Title } from "@mantine/core";
import classes from "@sproot/sproot-client/src/shell/header/HeaderContents.module.css";
import { useEffect, useState, useTransition } from "react";
import { useLocation } from "react-router-dom";
import { Page } from "../Pages";
import NotificationCenter from "./NotificationCenter";

interface HeaderContentsProps {
  navbarToggle: () => void;
  navbarOpened: boolean;
  navbarItems: Record<string, Page>;
}

export default function HeaderContents({
  navbarToggle,
  navbarOpened,
  navbarItems,
}: HeaderContentsProps) {
  const [headerText, setHeaderText] = useState("");
  const [, startTransition] = useTransition();
  const location = useLocation();
  function toggleNavbar() {
    startTransition(() => {
      navbarToggle();
    });
  }
  useEffect(() => {
    setHeaderText(
      extractHeaderText(Object.values(navbarItems)).filter(
        (page) => page.href === location.pathname,
      )[0]?.headerText ?? "",
    );
  }, [location, navbarItems]);

  // If headerText is empty, try resolving dynamic routes (e.g. /journals/:id)
  useEffect(() => {
    if (headerText) return;

    const path = location.pathname;

    // journals detail route: /journals/:journalId
    if (path.startsWith("/journals/")) {
      setHeaderText("Journals");
    }
  }, [location, headerText]);

  return (
    <header className={classes["header"]}>
      <Container hiddenFrom="sm" size="md" className={classes["gridInner"]!}>
        <Burger onClick={toggleNavbar} opened={navbarOpened} size="md" />
        <div className={classes["titleSlot"]!}>
          <Title hiddenFrom="sm" order={1} className={classes["hiddenTitle"]!}>
            {headerText}
          </Title>
        </div>
        <div className={classes["actionSlot"]!}>
          <NotificationCenter />
        </div>
      </Container>
      <Container visibleFrom="sm" size="md" className={classes["gridInner"]!}>
        <Box />
        <div className={classes["titleSlot"]!}>
          <Title order={1} visibleFrom="sm">
            {headerText}
          </Title>
        </div>
        <div className={classes["actionSlot"]!}>
          <NotificationCenter />
        </div>
      </Container>
    </header>
  );
}

function extractHeaderText(
  pages: Page[],
): { href: string; headerText: string }[] {
  const result = [];

  for (const page of pages) {
    if (page.href && page.headerText) {
      result.push({ href: page.href, headerText: page.headerText });
    }

    // If the object has links, process them recursively
    if (Array.isArray(page.links)) {
      result.push(...extractHeaderText(page.links));
    }
  }

  return result;
}
