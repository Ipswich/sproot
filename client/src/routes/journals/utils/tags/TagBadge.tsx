import React from "react";
import { Badge } from "@mantine/core";

export type SimpleTag = {
  id: number;
  name?: string | null;
  color?: string | null;
};

export function TagBadge({
  tag,
  children,
}: {
  tag: SimpleTag;
  children?: React.ReactNode;
}) {
  return (
    <Badge key={tag.id} color={tag.color ?? "gray"} radius="sm">
      {children ?? tag.name}
    </Badge>
  );
}

export default TagBadge;
