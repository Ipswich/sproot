import { Burger, Container, Group } from "@mantine/core";
// import { MantineLogo } from '@mantinex/mantine-logo';
import classes from "./HeaderContents.module.css";

interface HeaderContentsProps {
  title: string;
  navbarToggle: () => void;
  navbarOpened: boolean;
}

export default function HeaderContents({
  title,
  navbarToggle,
  navbarOpened,
}: HeaderContentsProps) {
  return (
    <header className={classes["header"]}>
      <Container size="md" className={classes["inner"]!}>
        <Burger
          onClick={navbarToggle}
          opened={navbarOpened}
          size="md"
          hiddenFrom="sm"
        />
        {/* <MantineLogo size={28} /> */}
        {/* <h1>{title}</h1> */}
        <Group>
          <h1>{title}</h1>
        </Group>
      </Container>
    </header>
  );
}
