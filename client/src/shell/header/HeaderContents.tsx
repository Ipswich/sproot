import { Burger, Container, Group, Title } from "@mantine/core";
import classes from "@sproot/sproot-client/src/shell/header/HeaderContents.module.css";
import { Page } from "@sproot/sproot-client/src/shell/Pages";
import { useTransition } from "react";

interface HeaderContentsProps {
  currentPage: Page;
  navbarToggle: () => void;
  navbarOpened: boolean;
}

export default function HeaderContents({
  currentPage,
  navbarToggle,
  navbarOpened,
}: HeaderContentsProps) {
  const [, startTransition] = useTransition();

  function toggleNavbar() {
    startTransition(() => {
      navbarToggle();
    });
  }

  return (
    <header className={classes["header"]}>
      <Container
        style={{ justifyContent: "space-between" }}
        hiddenFrom="sm"
        size="md"
        className={classes["inner"]!}
      >
        <Burger onClick={toggleNavbar} opened={navbarOpened} size="md" />
        <Title hiddenFrom="sm" order={1}>
          {currentPage.headerText}
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
            {currentPage.headerText}
          </Title>
        </Group>
      </Container>
    </header>
  );
}
