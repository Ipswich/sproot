import { Table, ActionIcon, Switch, Group } from "@mantine/core";
import { IAutomation } from "@sproot/automation/IAutomation";
import { IOutputBase } from "@sproot/sproot-common/src/outputs/IOutputBase";
import { ISensorBase } from "@sproot/sproot-common/src/sensors/ISensorBase";
import { ISubcontroller } from "@sproot/system/ISubcontroller";
import { IconEdit } from "@tabler/icons-react";

interface EditablesTableProps {
  editables: ISensorBase[] | IOutputBase[] | IAutomation[] | ISubcontroller[];
  onEditClick: (
    item: ISensorBase | IOutputBase | IAutomation | ISubcontroller,
  ) => void;
  onNameClick?: (
    item: ISensorBase | IOutputBase | IAutomation | ISubcontroller,
  ) => void;
  onSwitchClick?: (
    item: { id: number; enabled: boolean },
    enabled: boolean,
  ) => void;
}

export default function EditablesTable({
  editables,
  onEditClick,
  onNameClick = undefined,
  onSwitchClick = undefined,
}: EditablesTableProps) {
  return (
    <Table
      highlightOnHover
      style={{
        marginLeft: "auto",
        marginRight: "auto",
      }}
    >
      <Table.Thead>
        <Table.Tr>
          {onSwitchClick && (
            <Table.Th style={{ textAlign: "center" }}>Enabled</Table.Th>
          )}
          <Table.Th style={{ textAlign: "center" }}>Name</Table.Th>
          <Table.Th style={{ textAlign: "center" }}>Edit</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {[...editables]
          .sort((a, b) =>
            (a.name || "").localeCompare(b.name || "", undefined, {
              sensitivity: "base",
            }),
          )
          .map((editable) => (
            <Table.Tr key={editable.id}>
              {onSwitchClick && (
                <Table.Td pl="" style={{ width: "25%" }} align="left">
                  <Group justify="center">
                    <Switch
                      checked={
                        (editable as { id: number; enabled: boolean }).enabled
                      }
                      onChange={(event) => {
                        onSwitchClick(
                          editable as { id: number; enabled: boolean },
                          event.currentTarget.checked,
                        );
                      }}
                    />
                  </Group>
                </Table.Td>
              )}
              <Table.Td
                align="center"
                onClick={
                  onNameClick
                    ? () => {
                        onNameClick(editable);
                      }
                    : undefined
                }
              >
                {editable.name}
              </Table.Td>
              <Table.Td style={{ width: "25%" }} align="center">
                <Group justify="center">
                  <ActionIcon
                    onClick={() => {
                      onEditClick(editable);
                    }}
                  >
                    <IconEdit />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
      </Table.Tbody>
    </Table>
  );
}
