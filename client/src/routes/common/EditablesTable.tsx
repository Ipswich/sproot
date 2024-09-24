import { Table, ActionIcon } from "@mantine/core";
import { IAutomation } from "@sproot/automation/IAutomation";
import { IOutputBase } from "@sproot/sproot-common/src/outputs/IOutputBase";
import { ISensorBase } from "@sproot/sproot-common/src/sensors/ISensorBase";
import { IconEdit } from "@tabler/icons-react";

interface EditablesTableProps {
  editables: ISensorBase[] | IOutputBase[] | IAutomation[];
  onEditClick: (item: ISensorBase | IOutputBase | IAutomation) => void;
  onNameClick?: (item: ISensorBase | IOutputBase | IAutomation) => void;
}

export default function EditablesTable({
  editables,
  onEditClick,
  onNameClick = undefined,
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
          <Table.Th style={{ textAlign: "center" }}>Name</Table.Th>
          <Table.Th style={{ textAlign: "center" }}>Edit</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {Object.values(editables).map((editable) => (
          <Table.Tr key={editable.id}>
            <Table.Td align="center" onClick={onNameClick ? () => {onNameClick(editable)} : undefined}>
              {editable.name}
              </Table.Td>
            <Table.Td align="center">
              <ActionIcon
                onClick={() => {
                  onEditClick(editable);
                }}
              >
                <IconEdit />
              </ActionIcon>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
