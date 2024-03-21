import { RingProgress, Center, Group, rem } from "@mantine/core";
import { IconPower } from "@tabler/icons-react";

export interface StatsRingProps {
  value: number;
  color: string;
}

export function StatsRing({ value, color }: StatsRingProps) {
  const Icon = IconPower;
  return (
    // <Paper withBorder radius="md" p="xs" key={output.id}>
    <Group>
      <RingProgress
        size={80}
        roundCaps
        thickness={8}
        sections={[{ value, color }]}
        label={
          <Center>
            {value === 100 || value === 0 ? (
              <Icon style={{ width: rem(20), height: rem(20) }} stroke={1.5} />
            ) : (
              `${value}%`
            )}
          </Center>
        }
      />

      {/* <div>
            <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
              {stat.label}
            </Text>
            <Text fw={700} size="xl">
              {stat.stats}
            </Text>
          </div> */}
    </Group>
    // </Paper>
  );
}
