import {
  IconAdjustments,
  // IconArrowFork,
  IconBolt,
  // IconCalendarStats,
  // IconGauge,
  IconTemperatureSun,
  TablerIconsProps,
} from "@tabler/icons-react";

export interface Page {
  navLinkText: string;
  headerText: string;
  icon: (props: TablerIconsProps | undefined) => JSX.Element;
  links?: Page[];
}

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
        <IconTemperatureSun {...props} />
      ),
    } as Page,
    {
      navLinkText: "Output States",
      headerText: "Output States",
      icon: (props: TablerIconsProps | undefined) => <IconBolt {...props} />,
    } as Page,
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

  getNavLinkText() {
    return this.pages
      .map((item) => {
        let navLinks = [item.navLinkText];
        if (item.links) {
          navLinks = navLinks.concat(
            item.links.map((subLink) => subLink.navLinkText),
          );
        }
        return navLinks;
      })
      .flat();
  }

  getHeaderText() {
    return this.pages
      .map((item) => {
        let headerTexts = [item.headerText];
        if (item.links) {
          headerTexts = headerTexts.concat(
            item.links.map((subLink) => subLink.headerText),
          );
        }
        return headerTexts;
      })
      .flat();
  }
}
