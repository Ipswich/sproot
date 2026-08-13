import { ActionIcon, Center, Group, Menu, Table, Text } from "@mantine/core";
import { IAutomation } from "@sproot/automation/IAutomation";
import { IOutputBase } from "@sproot/common/outputs/IOutputBase";
import { ISensorBase } from "@sproot/common/sensors/ISensorBase";
import { ISubcontroller } from "@sproot/system/ISubcontroller";
import {
  IconEdit,
  IconSortAscending,
  IconSortDescending,
} from "@tabler/icons-react";
import { JSX, useState } from "react";

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
  sortBy?: "name" | "id" | undefined;
  sortDir?: "asc" | "desc" | undefined;
  onSortByChange?: (sortBy: "name" | "id") => void;
  onSortDirChange?: (sortDir: "asc" | "desc") => void;
  showSortControl?: boolean;
}

export default function EditablesTable({
  editables,
  onEditClick,
  onNameClick = undefined,
  tableLeftComponent = undefined,
  sortBy,
  sortDir,
  onSortByChange,
  onSortDirChange,
  showSortControl = true,
}: EditablesTableProps) {
  const [localSortBy, setLocalSortBy] = useState<"name" | "id">("name");
  const [localSortDir, setLocalSortDir] = useState<"asc" | "desc">("asc");

  const resolvedSortBy = sortBy ?? localSortBy;
  const resolvedSortDir = sortDir ?? localSortDir;

  function updateSortBy(nextSortBy: "name" | "id") {
    onSortByChange?.(nextSortBy);
    if (sortBy === undefined) {
      setLocalSortBy(nextSortBy);
    }
  }

  function updateSortDir(nextSortDir: "asc" | "desc") {
    onSortDirChange?.(nextSortDir);
    if (sortDir === undefined) {
      setLocalSortDir(nextSortDir);
    }
  }

  const sortedEditables = [...editables].sort((left, right) => {
    const dir = resolvedSortDir === "asc" ? 1 : -1;

    if (resolvedSortBy === "id") {
      return ((left.id ?? 0) - (right.id ?? 0)) * dir;
    }

    return (
      (left.name || "").localeCompare(right.name || "", undefined, {
        sensitivity: "base",
      }) * dir
    );
  });

  return (
    <>
      {showSortControl ? (
        <Group justify="flex-end" mb="xs">
          <Menu withinPortal={false} position="bottom-end">
            <Menu.Target>
              <ActionIcon size="lg" variant="light">
                {resolvedSortDir === "asc" ? (
                  <IconSortAscending size={16} />
                ) : (
                  <IconSortDescending size={16} />
                )}
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                onClick={() => {
                  if (resolvedSortBy === "name") {
                    updateSortDir(resolvedSortDir === "asc" ? "desc" : "asc");
                  } else {
                    updateSortBy("name");
                    updateSortDir("asc");
                  }
                }}
              >
                Name{" "}
                {resolvedSortBy === "name"
                  ? resolvedSortDir === "asc"
                    ? " ↑"
                    : " ↓"
                  : null}
              </Menu.Item>
              <Menu.Item
                onClick={() => {
                  if (resolvedSortBy === "id") {
                    updateSortDir(resolvedSortDir === "asc" ? "desc" : "asc");
                  } else {
                    updateSortBy("id");
                    updateSortDir("desc");
                  }
                }}
              >
                Create Date{" "}
                {resolvedSortBy === "id"
                  ? resolvedSortDir === "asc"
                    ? " ↑"
                    : " ↓"
                  : null}
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      ) : null}

      <Table highlightOnHover style={{ tableLayout: "auto" }}>
        <Table.Thead>
          <Table.Tr>
            {tableLeftComponent ? (
              <Table.Th w="20%" miw={56} ta="center">
                {tableLeftComponent.label}
              </Table.Th>
            ) : null}
            <Table.Th w="100%" ta="center">
              Name
            </Table.Th>
            <Table.Th w="10%" miw={52} ta="center">
              Edit
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {sortedEditables.map((editable) => (
            <Table.Tr key={editable.id}>
              {tableLeftComponent ? (
                <Table.Td ta="center">
                  <Center>{tableLeftComponent.Component(editable)}</Center>
                </Table.Td>
              ) : null}
              <Table.Td ta="center">
                <Text
                  fw={400}
                  fz="sm"
                  style={{
                    cursor: onNameClick ? "pointer" : "default",
                    textAlign: "center",
                  }}
                  onClick={
                    onNameClick
                      ? () => {
                          onNameClick(editable);
                        }
                      : undefined
                  }
                >
                  {editable.name}
                </Text>
              </Table.Td>
              <Table.Td ta="center">
                <Center>
                  <ActionIcon
                    variant="light"
                    onClick={() => {
                      onEditClick(editable);
                    }}
                  >
                    <IconEdit size={18} />
                  </ActionIcon>
                </Center>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </>
  );
}
