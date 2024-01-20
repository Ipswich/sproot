import { useEffect, useState } from "react";
import { MantineProvider, AppShell, Burger } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
// All packages except `@mantine/hooks` require styles imports
import "@mantine/core/styles.css";
import "./App.css";
import OutputCard from "./OutputCard";

import { ApiOutputsResponse } from "@sproot/sproot-common/dist/api/Responses";

import SensorSwipeable from "./sensors/Swipeable";
import { getOutputsAsync } from "./requests";

function App() {
  const [opened, { toggle }] = useDisclosure();
  const [outputs, setOutputs] = useState({} as ApiOutputsResponse);

  useEffect(() => {
    updateOutputsAsync();
  }, []);

  const updateOutputsAsync = async () => {
    setOutputs(await getOutputsAsync());
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
        </AppShell.Header>

        <AppShell.Navbar style={{ width: "200px", opacity: "84%" }} p="md">
          Sproot
        </AppShell.Navbar>

        <AppShell.Main>
          <>
            <div>
              <SensorSwipeable />
              <br></br>
              {outputs.outputs
                ? Object.keys(outputs.outputs).map((key) => (
                    <OutputCard
                      key={"OutputCard-" + outputs.outputs[key]?.id}
                      output={outputs.outputs[key]!}
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
