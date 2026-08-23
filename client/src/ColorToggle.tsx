import { ActionIcon, useMantineColorScheme } from "@mantine/core";
import { IconMoon, IconSun } from "@tabler/icons-react";

export default function ColorToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const nextColorScheme = colorScheme === "light" ? "dark" : "light";

  return (
    <ActionIcon
      onClick={() => setColorScheme(nextColorScheme)}
      variant="default"
      size="xl"
      radius="xl"
      aria-label={`Switch to ${nextColorScheme} mode`}
    >
      {colorScheme === "dark" ? (
        <IconSun stroke={1.5} />
      ) : (
        <IconMoon stroke={1.5} />
      )}
    </ActionIcon>
  );
}
