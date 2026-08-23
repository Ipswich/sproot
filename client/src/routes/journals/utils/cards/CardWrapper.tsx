import React from "react";
import { Card } from "@mantine/core";
import { applyHoverElevate } from "./hoverElevate";

export interface CardWrapperProps {
  onClick?: () => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  hoverElevate?: boolean;
}

export function CardWrapper({
  onClick,
  children,
  style,
  hoverElevate = true,
}: CardWrapperProps) {
  return (
    <Card
      withBorder
      shadow="sm"
      padding="sm"
      radius="md"
      style={{
        cursor: onClick ? "pointer" : "default",
        transition: "transform 150ms, box-shadow 150ms",
        background:
          "light-dark(var(--mantine-color-white), var(--mantine-color-dark-6))",
        borderColor:
          "light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-4))",
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        overflow: "hidden",
        ...style,
      }}
      onClick={onClick}
      onMouseEnter={(e) => hoverElevate && applyHoverElevate(e.currentTarget)}
      onMouseLeave={(e) =>
        hoverElevate && applyHoverElevate(e.currentTarget, false)
      }
    >
      {children}
    </Card>
  );
}

export default CardWrapper;
