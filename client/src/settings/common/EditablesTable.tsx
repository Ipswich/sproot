import { Table, ActionIcon } from "@mantine/core";
import { IOutputBase } from "@sproot/sproot-common/src/outputs/IOutputBase";
import { ISensorBase } from "@sproot/sproot-common/src/sensors/ISensorBase";
import { IconEdit } from "@tabler/icons-react";

interface EditablesTableProps {
  editables: Record<string, ISensorBase | IOutputBase>;
  onClick: (item: ISensorBase | IOutputBase) => void;
}

export default function EditablesTable({
  editables,
  onClick,
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
            <Table.Td align="center">{editable.name}</Table.Td>
            <Table.Td align="center">
              <ActionIcon
                onClick={() => {
                  onClick(editable);
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
