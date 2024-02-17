import { Burger, Container, Group, Title } from "@mantine/core";
// import { MantineLogo } from '@mantinex/mantine-logo';
import classes from "./HeaderContents.module.css";
import { Page } from "../Pages";

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
  return (
    <header className={classes["header"]}>
      <Container
        style={{ justifyContent: "space-between" }}
        hiddenFrom="sm"
        size="md"
        className={classes["inner"]!}
      >
        <Burger onClick={navbarToggle} opened={navbarOpened} size="md" />
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

{
  /* <Group/> */
}
{
  /* {currentPage.icon &&
<ThemeIcon variant="light" size={32}>
    <currentPage.icon style={{ width: rem(24), height: rem(24) }} />
</ThemeIcon>} */
}
{
  /* <MantineLogo size={28} /> */
}
{
  /* <h1>{title}</h1> */
}
