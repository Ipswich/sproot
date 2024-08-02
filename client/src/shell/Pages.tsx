import { ReadingType } from "@sproot/sensors/ReadingType";
import {
  IconAdjustments,
  IconBolt,
  IconChartBubble,
  IconChartLine,
  IconDroplet,
  IconLayoutDashboard,
  // IconPlant2,
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

export function getNavbarItems(readingTypes: ReadingType[]): Record<string, Page> {
  return {
    dashboard: {
      navLinkText: "Dashboard",
      headerText: "Dashboard",
      href: "/",
      icon: (props: TablerIconsProps | undefined) => <IconLayoutDashboard {...props} />,
    },
    currentConditions: {
      navLinkText: "Current Conditions",
      headerText: "Current Conditions",
      icon: (props: TablerIconsProps | undefined) => <IconChartLine {...props} />,
      links: readingTypes.map((readingType) => curentConditionLinks[readingType])
        .filter((link) => link !== undefined),
    },
    outputStates: {
      navLinkText: "Output States",
      headerText: "Output States",
      href: "/output-states",
      icon: (props: TablerIconsProps | undefined) => <IconBolt {...props} />,
    },
    // automatic: {
    //     navLinkText: "Automatic",
    //     headerText: "Automatic",
    //     icon: (props: TablerIconsProps | undefined) => (
    //       <IconAutomation {...props} />
    //     ),
    //   },
    settings: {
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
    },
  }
}

const curentConditionLinks: Record<ReadingType, Page> = {
  temperature: {
    navLinkText: "Temperature",
    headerText: "Current Conditions",
    href: "/current-conditions/temperature",
    icon: (props: TablerIconsProps | undefined) => (
      <IconTemperature {...props} />
    ),
  },
  humidity: {
    navLinkText: "Humidity",
    headerText: "Current Conditions",
    href: "/current-conditions/humidity",
    icon: (props: TablerIconsProps | undefined) => (
      <IconDroplet {...props} />
    ),
  },
  pressure: {
    navLinkText: "Pressure",
    headerText: "Current Conditions",
    href: "/current-conditions/pressure",
    icon: (props: TablerIconsProps | undefined) => (
      <IconChartBubble {...props} />
    ),
  },
};

export class Pages {
  public pages: Page[] = [
    // {
    //   navLinkText: "Dashboard",
    //   headerText: "Dashboard",
    //   icon: (props: TablerIconsProps | undefined) => <IconGauge {...props} />,
    // } as Page,
    {
      navLinkText: "Current Conditions",
      headerText: "Current Conditions",
      icon: (props: TablerIconsProps | undefined) => (
        // <IconTemperatureSun {...props} />
        <IconChartLine {...props} />
      ),
      links: [
        { navLinkText: "Sensors", headerText: "Sensor Settings" } as Page,
        { navLinkText: "Outputs", headerText: "Output Settings" } as Page,
        // { navLinkText: "System", headerText: "System Settings" } as Page,
      ],
    },
    {
      navLinkText: "Output States",
      headerText: "Output States",
      icon: (props: TablerIconsProps | undefined) => <IconBolt {...props} />,
    },
    // {
    //   navLinkText: "Automatic",
    //   headerText: "Automatic",
    //   icon: (props: TablerIconsProps | undefined) => (
    //     <IconCalendarStats {...props} />
    //   ),
    // } as Page,
    // {
    //   navLinkText: "Triggers",
    //   headerText: "Triggers",
    //   icon: (props: TablerIconsProps | undefined) => (
    //     <IconArrowFork {...props} />
    //   ),
    // } as Page,
    {
      navLinkText: "Settings",
      headerText: "Settings",
      icon: (props: TablerIconsProps | undefined) => (
        <IconAdjustments {...props} />
      ),
      links: [
        { navLinkText: "Sensors", headerText: "Sensor Settings" } as Page,
        { navLinkText: "Outputs", headerText: "Output Settings" } as Page,
        // { navLinkText: "System", headerText: "System Settings" } as Page,
      ],
    },
  ];
}
