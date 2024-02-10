import { useEffect, useState } from "react";
import { MantineProvider, AppShell, Burger } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
// All packages except `@mantine/hooks` require styles imports
import "@mantine/core/styles.css";
import "./App.css";
import OutputCard from "./OutputCard";

import SensorCarousel from "./sensors/SensorCarousel";
import { getOutputsAsync } from "./requests";
import { IOutputBase } from "@sproot/sproot-common/src/outputs/OutputBase";
import ColorToggle from "./ColorToggle";

function App() {
  const [opened, { toggle }] = useDisclosure();
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
        header={{ height: 60 }}
        navbar={{
          width: 300,
          breakpoint: "sm",
          collapsed: { mobile: !opened },
        }}
        padding="md"
      >
        <AppShell.Header style={{ paddingLeft: "14px", paddingTop: "12px" }}>
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <ColorToggle />
        </AppShell.Header>

        <AppShell.Navbar style={{ width: "200px", opacity: "84%" }} p="md">
          Sproot
        </AppShell.Navbar>

        <AppShell.Main>
          <>
            <div>
              <SensorCarousel />
              <br></br>
              {outputs
                ? Object.keys(outputs).map((key) => (
                    <OutputCard
                      key={"OutputCard-" + outputs[key]?.id}
                      output={outputs[key]!}
                      updateOutputsAsync={updateOutputsAsync}
                    />
                  ))
                : "No Outputs"}
              <br></br>
            </div>
          </>
        </AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}

export default App;
