import { ActionIcon, useMantineColorScheme } from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";
import cx from "clsx";

export default function ColorToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  return (
    <ActionIcon
      onClick={() => setColorScheme(colorScheme === "light" ? "dark" : "light")}
      variant="default"
      size="xl"
      aria-label="Toggle color scheme"
    >
      {colorScheme === "dark" ? (
        <IconSun className={cx(".icon", ".light")} stroke={1.5} />
      ) : (
        <IconMoon className={cx(".icon", ".dark")} stroke={1.5} />
      )}
    </ActionIcon>
  );
}
