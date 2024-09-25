import { Table, ActionIcon } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { ReactNode } from "react";

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
    <Table
      highlightOnHover
      style={{
        marginLeft: "auto",
        marginRight: "auto",
      }}
    >
      <Table.Thead>
        <Table.Tr></Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {Object.values(deletables).map((deletable) => (
          <Table.Tr key={deletable.id}>
            <Table.Td px="0px" align="center">
              {deletable.displayLabel}
            </Table.Td>
            {!readOnly && (
              <Table.Td align="center" w={"40px"}>
                <ActionIcon
                  color="grey"
                  onClick={async () => {
                    await deletable.deleteFn(deletable.id);
                  }}
                >
                  <IconTrash />
                </ActionIcon>
              </Table.Td>
            )}
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
