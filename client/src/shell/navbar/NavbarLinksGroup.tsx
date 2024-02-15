import { useState } from "react";
import {
  Group,
  Box,
  Collapse,
  ThemeIcon,
  Text,
  UnstyledButton,
  rem,
} from "@mantine/core";
import { IconChevronRight, TablerIconsProps } from "@tabler/icons-react";
import classes from "./NavbarLinksGroup.module.css";
import { Page } from "../Pages";

interface LinksGroupProps {
  icon: (props: TablerIconsProps | undefined) => JSX.Element;
  navLinkText: string;
  initiallyOpened?: boolean;
  page: Page;
  setCurrentPage: (page: Page) => void;
}

export function LinksGroup({
  icon: Icon,
  navLinkText,
  initiallyOpened,
  page,
  setCurrentPage,
}: LinksGroupProps) {
  const hasLinks = Array.isArray(page.links);
  const [opened, setOpened] = useState(initiallyOpened || false);
  const items = (page.links ?? []).map((link) => (
    <Text<"a">
      component="a"
      className={classes["link"]!}
      href={"."}
      key={link.navLinkText}
      onClick={(event) => {
        event.preventDefault();
        setCurrentPage(link);
      }}
    >
      {link.navLinkText}
    </Text>
  ));

  return (
    <>
      <UnstyledButton
        onClick={() => {
          setOpened((o) => !o);
          if (!hasLinks) {
            setCurrentPage(page);
          }
        }}
        className={classes["control"]!}
      >
        <Group justify="space-between" gap={0}>
          <Box style={{ display: "flex", alignItems: "center" }}>
            <ThemeIcon variant="light" size={30}>
              <Icon style={{ width: rem(18), height: rem(18) }} />
            </ThemeIcon>
            <Box ml="md">{navLinkText}</Box>
          </Box>
          {hasLinks && (
            <IconChevronRight
              className={classes["chevron"]}
              stroke={1.5}
              style={{
                width: rem(16),
                height: rem(16),
                transform: opened ? "rotate(-90deg)" : "none",
              }}
            />
          )}
        </Group>
      </UnstyledButton>
      {hasLinks ? <Collapse in={opened}>{items}</Collapse> : null}
    </>
  );
}
