import { useEffect, useState } from "react";
import { MantineProvider, AppShell, ActionIcon, Flex } from "@mantine/core";
import { IconMenu2, IconX } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
// All packages except `@mantine/hooks` require styles imports
import "@mantine/core/styles.css";
import "./App.css";
import OutputCard from "./OutputCard";

import CarouselContainer from "./sensors/CarouselContainer";
import { getOutputsAsync } from "./requests";
import { IOutputBase } from "@sproot/sproot-common/src/outputs/OutputBase";
import ColorToggle from "./ColorToggle";
import NavbarContents from "./shell/navbar/NavbarContents";

function App() {
  const [opened, { toggle, open, close }] = useDisclosure();
  const [outputs, setOutputs] = useState({} as Record<string, IOutputBase>);

  useEffect(() => {
    updateOutputsAsync();
    const interval = setInterval(async () => {
      updateOutputsAsync();
    }, 300000);

    return () => clearInterval(interval);
  }, []);

  const updateOutputsAsync = async () => {
    setOutputs((await getOutputsAsync()).outputs);
  };

  return (
    <MantineProvider>
      <AppShell
        navbar={{
          width: 250,
          breakpoint: "sm",
          collapsed: { mobile: !opened },
        }}
        padding="md"
      >
        <AppShell.Navbar style={{width:"250px", opacity: "90%", zIndex: 202 }} p="md">
          <Flex align="center" justify="flex-end">
            <ActionIcon variant="filled" onClick={toggle} hiddenFrom="sm">
              <IconX />
            </ActionIcon>
            </Flex>
          <NavbarContents />
          <ColorToggle />
        </AppShell.Navbar>

        <AppShell.Main>
          <>
            <Flex align="center" justify="flex-end" style={{ position:"absolute", zIndex: 201, left: 6, top: 6}}>
              <ActionIcon variant="filled" radius={"xl"} size={"56"} onClick={open} hiddenFrom="sm">
                <IconMenu2 size={32}/>
              </ActionIcon>
            </Flex>
            <div onClick={close}>
              <CarouselContainer />
              {outputs
                ? Object.keys(outputs).map((key) => (
                    <OutputCard
                      key={"OutputCard-" + outputs[key]?.id}
                      output={outputs[key]!}
                      updateOutputsAsync={updateOutputsAsync}
                    />
                  ))
                : "No Outputs"}
            </div>
          </>
        </AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}

export default App;
