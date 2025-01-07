import { Burger, Container, Group, Title } from "@mantine/core";
import classes from "@sproot/sproot-client/src/shell/header/HeaderContents.module.css";
import { useEffect, useState, useTransition } from "react";
import { useLoaderData, useLocation } from "react-router-dom";
import { getNavbarItems, Page } from "../Pages";
import { ReadingType } from "@sproot/sensors/ReadingType";
import { IOutputBase } from "@sproot/outputs/IOutputBase";

interface HeaderContentsProps {
  navbarToggle: () => void;
  navbarOpened: boolean;
}

export default function HeaderContents({
  navbarToggle,
  navbarOpened,
}: HeaderContentsProps) {
  const [headerText, setHeaderText] = useState("");
  const [, startTransition] = useTransition();
  const location = useLocation();
  function toggleNavbar() {
    startTransition(() => {
      navbarToggle();
    });
  }

  const loaderData = useLoaderData() as {
    readingTypes: Partial<Record<ReadingType, string>>;
    outputs: Record<string, IOutputBase>;
  };
  const readingTypes = Object.keys(loaderData.readingTypes) as ReadingType[];
  const outputs = Object.values(loaderData.outputs);

  const navbarItems = getNavbarItems(readingTypes, outputs);
  useEffect(() => {
    setHeaderText(
      extractHeaderText(Object.values(navbarItems)).filter(
        (page) => page.href === location.pathname,
      )[0]?.headerText ?? "",
    );
  }, [location, navbarItems]);

  return (
    <header className={classes["header"]}>
      <Container
        style={{ justifyContent: "space-between" }}
        hiddenFrom="sm"
        size="md"
        className={classes["inner"]!}
      >
        <Burger onClick={toggleNavbar} opened={navbarOpened} size="md" />
        <Title hiddenFrom="sm" order={1} className={classes["hiddenTitle"]!}>
          {headerText}
        </Title>
        <Group></Group>
      </Container>
      <Container
        style={{ justifyContent: "center" }}
        visibleFrom="sm"
        size="md"
        className={classes["inner"]!}
      >
        <Group>
          <Title order={1} visibleFrom="sm">
            {headerText}
          </Title>
        </Group>
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
