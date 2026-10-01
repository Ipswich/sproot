import { PropsWithChildren } from "react";
import {
  MantineProvider,
  createTheme,
  localStorageColorSchemeManager,
} from "@mantine/core";

const colorSchemeManager = localStorageColorSchemeManager({
  key: "sproot-color-scheme",
});

const theme = createTheme({
  defaultRadius: "md",
  components: {
    Input: {
      defaultProps: {
        autoComplete: "off",
      },
      styles: {
        input: {
          fontSize: "16px",
        },
      },
    },
    TextInput: {
      defaultProps: {
        autoComplete: "off",
      },
    },
    Textarea: {
      defaultProps: {
        autoComplete: "off",
      },
    },
    NumberInput: {
      defaultProps: {
        autoComplete: "off",
      },
    },
    Select: {
      defaultProps: {
        autoComplete: "off",
        comboboxProps: { withinPortal: false },
      },
    },
    ColorInput: {
      defaultProps: {
        autoComplete: "off",
        popoverProps: { withinPortal: false },
      },
    },
  },
});

export default function AppProviders({ children }: PropsWithChildren) {
  return (
    <MantineProvider
      theme={theme}
      colorSchemeManager={colorSchemeManager}
      defaultColorScheme="light"
    >
      {children}
    </MantineProvider>
  );
}