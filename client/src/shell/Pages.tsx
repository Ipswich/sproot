import { IOutputBase } from "@sproot/outputs/IOutputBase";
import { ReadingType } from "@sproot/sensors/ReadingType";
import {
  IconAdjustments,
  IconBolt,
  IconChartBubble,
  IconChartLine,
  IconDroplet,
  IconLayoutDashboard,
  // IconPlant2,
  // IconSeeding,
  IconSettingsAutomation,
  IconTemperature,
  TablerIconsProps,
} from "@tabler/icons-react";

export interface Page {
  navLinkText: string;
  headerText: string;
  href?: string;
  icon: (props: TablerIconsProps | undefined) => JSX.Element;
  links?: Page[];
}

export function getNavbarItems(
  readingTypes: ReadingType[],
  outputs: IOutputBase[],
): Record<string, Page> {
  const pages = {
    dashboard: {
      navLinkText: "Dashboard",
      headerText: "Dashboard",
      href: "/",
      icon: (props: TablerIconsProps | undefined) => (
        <IconLayoutDashboard {...props} />
      ),
    },
  } as Record<string, Page>;

  if (readingTypes.length > 0) {
    pages["sensorData"] = {
      navLinkText: "Sensor Data",
      headerText: "Sensor Data",
      icon: (props: TablerIconsProps | undefined) => (
        <IconChartLine {...props} />
      ),
      links: readingTypes.map((readingType) => {
        return sensorDataLinks[readingType];
      }),
    };
  }

  if (outputs.length > 0) {
    pages["outputStates"] = {
      navLinkText: "Output States",
      headerText: "Output States",
      href: "/output-states",
      icon: (props: TablerIconsProps | undefined) => <IconBolt {...props} />,
    };
  }

  pages["automations"] = {
    navLinkText: "Automations",
    headerText: "Automations",
    href: "/automations",
    icon: (props: TablerIconsProps | undefined) => (
      <IconSettingsAutomation {...props} />
    ),
  };

  pages["settings"] = {
    navLinkText: "Settings",
    headerText: "Settings",
    icon: (props: TablerIconsProps | undefined) => (
      <IconAdjustments {...props} />
    ),
    links: [
      {
        navLinkText: "Sensors",
        headerText: "Sensor Settings",
        href: "/settings/sensors",
      } as Page,
      {
        navLinkText: "Outputs",
        headerText: "Output Settings",
        href: "/settings/outputs",
      } as Page,
      // {
      //   navLinkText: "System",
      //   headerText: "System Settings",
      //   href: "/settings/system"
      // } as Page,
    ],
  };

  return pages;
}

const sensorDataLinks: Record<ReadingType, Page> = {
  temperature: {
    navLinkText: "Temperature",
    headerText: "Sensor Data",
    href: "/sensor-data/temperature",
    icon: (props: TablerIconsProps | undefined) => (
      <IconTemperature {...props} />
    ),
  },
  humidity: {
    navLinkText: "Humidity",
    headerText: "Sensor Data",
    href: "/sensor-data/humidity",
    icon: (props: TablerIconsProps | undefined) => <IconDroplet {...props} />,
  },
  pressure: {
    navLinkText: "Pressure",
    headerText: "Sensor Data",
    href: "/sensor-data/pressure",
    icon: (props: TablerIconsProps | undefined) => (
      <IconChartBubble {...props} />
    ),
  },
};
