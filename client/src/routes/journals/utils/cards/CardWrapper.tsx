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
        background: "var(--mantine-color-white, #fff)",
        borderColor: "rgba(15, 23, 42, 0.06)",
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
