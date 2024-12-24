import { Group, Box, Collapse, ThemeIcon, rem } from "@mantine/core";
import { IconChevronRight, TablerIconsProps } from "@tabler/icons-react";
import classes from "./css/NavbarLinksGroup.module.css";
import { Page } from "../Pages";
import { Link } from "react-router-dom";

interface LinksGroupProps {
  icon: (props: TablerIconsProps | undefined) => JSX.Element;
  navLinkText: string;
  page: Page;
  closeNavbar: () => void;
  openedLinkGroups: string[];
  setOpenedLinkGroups: (linkGroups: string[]) => void;
}

export function LinksGroup({
  icon: Icon,
  navLinkText,
  page,
  closeNavbar: closeNavbar,
  openedLinkGroups,
  setOpenedLinkGroups,
}: LinksGroupProps) {
  const hasLinks = Array.isArray(page.links);
  const items = (page.links ?? []).map((link) => (
    <Link
      className={classes["link"]!}
      to={link.href ?? "#"}
      key={link.navLinkText}
      onClick={() => {
        setOpenedLinkGroups([]);
        closeNavbar();
      }}
    >
      {link.navLinkText}
    </Link>
  ));

  return (
    <>
      <Link
        to={page.href ?? "#"}
        className={classes["control"]!}
        onClick={() => {
          //If we have THIS link group opened, close it. Otherwise, open it.
          if (openedLinkGroups.includes(page.navLinkText)) {
            setOpenedLinkGroups(
              openedLinkGroups.filter((item) => item !== page.navLinkText),
            );
          } else {
            setOpenedLinkGroups([...openedLinkGroups, page.navLinkText]);
          }
          if (!hasLinks) {
            setOpenedLinkGroups([]);
            closeNavbar();
          }
        }}
      >
        <Group justify="space-between" gap={0}>
          <Box style={{ display: "flex", alignItems: "center" }}>
            <ThemeIcon variant="light" size={30}>
              <Icon style={{ width: rem(18), height: rem(18) }} />
            </ThemeIcon>
            <Box ml="8px">{navLinkText}</Box>
          </Box>
          {hasLinks && (
            <IconChevronRight
              className={classes["chevron"]}
              stroke={1.5}
              style={{
                width: rem(16),
                height: rem(16),
                transform: openedLinkGroups.includes(page.navLinkText)
                  ? "rotate(90deg)"
                  : "none",
              }}
            />
          )}
        </Group>
      </Link>
      {hasLinks ? (
        <Collapse in={openedLinkGroups.includes(page.navLinkText)}>
          {items}
        </Collapse>
      ) : null}
    </>
  );
}
