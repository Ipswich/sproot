import { Burger, Container, Group, Title } from "@mantine/core";
import classes from "@sproot/sproot-client/src/shell/header/HeaderContents.module.css";
import { useEffect, useState, useTransition } from "react";
import { useLocation } from "react-router-dom";
import { Page } from "../Pages";
import { useQueryClient } from "@tanstack/react-query";
import { getJournalsAsync } from "@sproot/sproot-client/src/requests/requests_v2";
import { SDBJournal } from "@sproot/database/SDBJournal";

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
  const queryClient = useQueryClient();
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
      const parts = path.split("/").filter(Boolean);
      const id = parts[1];
      if (id) {
        const journalsData = queryClient.getQueryData<Array<{ journal: SDBJournal }>>(["journals"]);
        if (journalsData && journalsData.length > 0) {
          const found = journalsData.find((j) => String(j.journal.id) === String(id));
          if (found) {
            setHeaderText(found.journal.title ?? "Journal");
            return;
          }
        }

        // If no cache available, fetch journals once and resolve title
        (async () => {
          try {
            const fetched = (await queryClient.fetchQuery({ queryKey: ["journals"], queryFn: getJournalsAsync })) as Array<{ journal: SDBJournal }>;
            const found = (fetched ?? []).find((j) => String(j.journal.id) === String(id));
            if (found) {
              setHeaderText(found.journal.title ?? "Journal");
            }
          } catch (err) {
            // ignore fetch errors and leave header empty
          }
        })();
      }
    }
  }, [location, headerText, queryClient]);

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
