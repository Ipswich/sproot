import { SDBCameraSettings } from "@sproot/database/SDBCameraSettings";
import { IOutputBase } from "@sproot/outputs/IOutputBase";
import { ReadingType } from "@sproot/sensors/ReadingType";
import type { IconProps } from "@tabler/icons-react";
import { JSX } from "react";
import {
  IconAdjustments,
  IconBolt,
  IconChartBubble,
  IconChartLine,
  IconDroplet,
  IconBucketDroplet,
  IconCircuitVoltmeter,
  // IconLayoutDashboard,
  // IconPlant2,
  // IconSeeding,
  IconSettingsAutomation,
  IconTemperature,
  IconVideo,
  IconHelpSquareRounded,
} from "@tabler/icons-react";

export interface Page {
  navLinkText: string;
  headerText: string;
  href?: string;
  external?: boolean;
  target?: string;
  icon: (props?: IconProps) => JSX.Element;
  links?: Page[];
}

export function getNavbarItems(
  readingTypes: ReadingType[],
  outputs: IOutputBase[],
  cameraSettings: SDBCameraSettings,
): Record<string, Page> {
  const pages = {} as Record<string, Page>;

  if (cameraSettings.enabled) {
    pages["live-view"] = {
      navLinkText: "Live View",
      headerText: "Live View",
      href: "/live-view",
      icon: (props?: IconProps) => <IconVideo {...props} />,
    };
  }

  if (readingTypes.length > 0) {
    pages["sensorData"] = {
      navLinkText: "Sensor Data",
      headerText: "Sensor Data",
      icon: (props?: IconProps) => <IconChartLine {...props} />,
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
      icon: (props?: IconProps) => <IconBolt {...props} />,
    };
  }

  pages["automations"] = {
    navLinkText: "Automations",
    headerText: "Automations",
    href: "/automations",
    icon: (props?: IconProps) => <IconSettingsAutomation {...props} />,
  };

  pages["settings"] = {
    navLinkText: "Settings",
    headerText: "Settings",
    icon: (props?: IconProps) => <IconAdjustments {...props} />,
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
      {
        navLinkText: "Camera",
        headerText: "Camera Settings",
        href: "/settings/camera",
      } as Page,
      {
        navLinkText: "Subcontrollers",
        headerText: "Subcontrollers",
        href: "/settings/subcontrollers",
      } as Page,
      {
        navLinkText: "System",
        headerText: "System Settings",
        href: "/settings/system",
      } as Page,
    ],
  };

  pages["docs"] = {
    navLinkText: "Docs",
    headerText: "Docs",
    href: "/docs",
    external: true,
    target: "_self",
    icon: (props?: IconProps) => <IconHelpSquareRounded {...props} />,
  };

  return pages;
}

const sensorDataLinks: Record<ReadingType, Page> = {
  temperature: {
    navLinkText: "Temperature",
    headerText: "Sensor Data",
    href: "/sensor-data/temperature",
    icon: (props?: IconProps) => <IconTemperature {...props} />,
  },
  humidity: {
    navLinkText: "Humidity",
    headerText: "Sensor Data",
    href: "/sensor-data/humidity",
    icon: (props?: IconProps) => <IconDroplet {...props} />,
  },
  pressure: {
    navLinkText: "Pressure",
    headerText: "Sensor Data",
    href: "/sensor-data/pressure",
    icon: (props?: IconProps) => <IconChartBubble {...props} />,
  },
  moisture: {
    navLinkText: "Soil Moisture",
    headerText: "Sensor Data",
    href: "/sensor-data/moisture",
    icon: (props?: IconProps) => <IconBucketDroplet {...props} />,
  },
  voltage: {
    navLinkText: "Voltage",
    headerText: "Sensor Data",
    href: "/sensor-data/voltage",
    icon: (props?: IconProps) => <IconCircuitVoltmeter {...props} />,
  },
};
