import { Group, Paper, Stack } from "@mantine/core";
import { ReactNode } from "react";
import ConfirmDeleteButton from "../../components/ConfirmDeleteButton";

interface DeletablesTableProps {
  deletables: {
    displayLabel: ReactNode;
    id: number;
    deleteFn: (id: number) => Promise<void>;
  }[];
  readOnly?: boolean;
}

export default function DeletablesTable({
  deletables,
  readOnly = false,
}: DeletablesTableProps) {
  return (
    <Stack gap="sm">
      {Object.values(deletables).map((deletable) => (
        <Paper key={deletable.id} withBorder radius="md" p="sm">
          <Group align="center" justify="space-between" wrap="nowrap">
            <div style={{ flex: 1, minWidth: 0 }}>{deletable.displayLabel}</div>
            {!readOnly && (
              <ConfirmDeleteButton
                kind="icon"
                actionIconProps={{
                  variant: "light",
                  size: "lg",
                  radius: "xl",
                }}
                onConfirm={() => deletable.deleteFn(deletable.id)}
              />
            )}
          </Group>
        </Paper>
      ))}
    </Stack>
  );
}
