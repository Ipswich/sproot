import { Select, Group, Text } from "@mantine/core";
import { getIcon } from "./getIcon";
import { readableTextColor } from "./readableTextColor";
import type { SelectProps } from "@mantine/core";

// list of icon export names from @tabler/icons-react used in the app
const ICON_NAMES = [
  "NullIcon",
  "IconLeaf",
  "IconPlant",
  "IconPlant2",
  "IconSeeding",
  "IconFlower",
  "IconCactus",
  "IconClover",
  "IconCherry",
  "IconTree",
  "IconButterfly",

  "IconSun",
  "IconSunHigh",
  "IconSunLow",
  "IconMoon",
  "IconCloud",
  "IconCloudRain",
  "IconCloudStorm",
  "IconCloudSnow",
  "IconWind",
  "IconRainbow",

  "IconDroplet",
  "IconDropletFilled",
  "IconBucket",
  "IconBucketDroplet",
  "IconSpray",
  "IconWaveSine",

  "IconShovel",
  "IconHammer",
  "IconTools",
  "IconTool",

  "IconFlask",
  "IconTestPipe",
  "IconMicroscope",
  "IconChartLine",
  "IconChartDots",
  "IconChartArea",
  "IconChartBar",

  "IconBook",
  "IconBook2",
  "IconNotebook",
  "IconNotes",
  "IconClipboard",
  "IconCalendar",
  "IconCalendarEvent",
  "IconCalendarStats",
  "IconEdit",

  "IconCarrot",
  "IconApple",
  "IconLemon",
  "IconPepper",
  "IconSalad",
  "IconBasket",

  "IconTrendingUp",
  "IconTarget",
  "IconTimeline",
  "IconStack",

  "IconStar",
  "IconStarFilled",
  "IconHeart",
  "IconBookmark",
  "IconFlag",
  "IconPin",
  "IconTag",

  "IconBulb",
  "IconPlug",
  "IconBattery",
  "IconCamera",
  "IconThermometer",
];

function friendlyName(iconExportName: string) {
  if (!iconExportName) return "";
  if (iconExportName === "NullIcon") return "None";
  // remove leading "Icon" if present
  const trimmed = iconExportName.replace(/^Icon/, "");
  // split camel case / numbers into words
  const words = trimmed
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
  // add spaces for digits
  return words.replace(/([a-zA-Z])([0-9])/g, "$1 $2").trim();
}

const SELECT_DATA = ICON_NAMES.map((name) => ({
  value: name,
  label: friendlyName(name),
}));

export interface IconSelectProps extends Omit<
  SelectProps,
  "data" | "itemComponent" | "icon"
> {
  iconSize?: number;
  iconColor?: string;
}

export function IconSelect({
  iconSize = 18,
  iconColor,
  value,
  rightSection,
  ...props
}: IconSelectProps) {
  // treat empty/null/undefined as NullIcon so "None" is shown by default
  const selectedValue =
    typeof value === "string" && value.length > 0 ? value : "NullIcon";
  const SelectedIcon = getIcon(selectedValue) as React.ElementType | null;

  const bg = iconColor ?? "#f1f3f5";
  const readableIconColor = readableTextColor(bg);

  return (
    <Select
      {...(props as SelectProps)}
      value={selectedValue}
      data={SELECT_DATA}
      renderOption={({ option }) => {
        const it = option as { value: string; label: string };
        const IconComp = getIcon(it.value) as React.ElementType | null;
        return (
          <Group align="center">
            {IconComp ? (
              <div
                style={{
                  width: iconSize * 2,
                  height: iconSize * 2,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 4,
                  background: bg,
                }}
              >
                <IconComp size={"50%"} color={readableIconColor} />
              </div>
            ) : null}
            <Text size="sm">{it.label}</Text>
          </Group>
        );
      }}
      rightSection={
        rightSection ??
        (SelectedIcon ? (
          <div
            style={{
              width: iconSize * 1.5,
              height: iconSize * 1.5,
              display: "grid",
              placeItems: "center",
              borderRadius: 4,
              background: bg,
            }}
          >
            <SelectedIcon size={"50%"} color={readableIconColor} />
          </div>
        ) : null)
      }
    />
  );
}

export default IconSelect;
