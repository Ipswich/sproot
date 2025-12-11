import { Table, ActionIcon, Group } from "@mantine/core";
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
  tableLeftComponent?: {
    label: string;
    Component: (editable: unknown) => JSX.Element;
  };
}

export default function EditablesTable({
  editables,
  onEditClick,
  onNameClick = undefined,
  tableLeftComponent = undefined,
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
          {tableLeftComponent && (
            <Table.Th style={{ textAlign: "center" }}>
              {tableLeftComponent.label}
            </Table.Th>
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
              {tableLeftComponent && (
                <Table.Td pl="" style={{ width: "25%" }} align="left">
                  <Group justify="center">
                    {tableLeftComponent.Component(editable)}
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
