import * as iconModule from "@tabler/icons-react";
import React from "react";

export function getIcon(name: string) {
  try {
    const key = name || "NullIcon";
    const icons = iconModule as unknown as Record<
      string,
      React.ElementType | undefined
    >;
    const icon = icons[key];
    if (icon && React.isValidElement(React.createElement(icon))) {
      return icon;
    }
    return icons["NullIcon"] || null;
  } catch (error) {
    console.warn(`Icon "${name}" not found.`, error);
    return null;
  }
}

export default getIcon;
