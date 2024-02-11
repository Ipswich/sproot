import { Group, Code, ScrollArea } from '@mantine/core';
import {
  IconCalendarStats,
  IconGauge,
  IconAdjustments,
  IconArrowFork,
  IconBolt,
  IconTemperatureSun
} from '@tabler/icons-react';

import { LinksGroup } from './NavbarLinksGroup';
// import { Logo } from './Logo';
import classes from './NavbarContents.module.css';

const mockdata = [
  { label: 'Dashboard', icon: IconGauge },
  { label: 'Current Conditions', icon: IconTemperatureSun},
  { label: 'Output States', icon: IconBolt},
  { label: 'Schedule', icon: IconCalendarStats},
  { label: 'Triggers', icon: IconArrowFork},
  { label: 'Settings', icon: IconAdjustments,
    links: [
      {label: "Sensors", link: "."},
      {label: "Outputs", link: "."},
      {label: "System", link: "."}, 
    ]
  },
];

export default function NavbarContents() {
  const links = mockdata.map((item) => <LinksGroup {...item} key={item.label} />);

  return (
    <nav className={classes['navbar']}>
      <div className={classes['header']}>
        <Group justify="space-between">
          {/* <Logo style={{ width: rem(120) }} /> */}
          <h1>Sproot</h1>
          <Code fw={700}>{import.meta.env["VITE_CLIENT_VERSION"]}</Code>
        </Group>
      </div>

      <ScrollArea className={classes['links']!}>
        <div className={classes['linksInner']}>{links}</div>
      </ScrollArea>

      <div className={classes['footer']}>
      </div>
    </nav>
  );
}