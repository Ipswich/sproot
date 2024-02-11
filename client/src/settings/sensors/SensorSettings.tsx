import { Fragment, useEffect, useState } from "react";
import { getSensorsAsync, getSupportedModelsAsync } from "../../requests";
import { ISensorBase } from "@sproot/src/sensors/SensorBase";
import { Text, Button, Stack, TextInput, NativeSelect, Card, Space, Table, ActionIcon } from "@mantine/core";
import { IconEdit } from "@tabler/icons-react";

export default function SensorSettings() {
  const [sensors, setSensors] = useState({} as Record<string, ISensorBase>);
  const [supportedModels, setSupportedModels] = useState([] as string[]);

  const [currentStep, setCurrentStep] = useState(0);
  useEffect(() => {
    async function getSensors() {
      setSensors((await getSensorsAsync()).sensors);
      setSupportedModels((await getSupportedModelsAsync()).supportedModels);

    }
    getSensors();
  }, []);
  return (
    <Fragment>
      <h1>Sensor Settings</h1>
      <Stack h="600" justify="center" align="center">


      {currentStep === 0 && (
        <Fragment>
          <Table
          highlightOnHover
          style={{
            marginLeft: "auto",
            marginRight: "auto",
          }}
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{textAlign:"center"}}>Name</Table.Th>
                <Table.Th style={{textAlign:"center"}}>Edit</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {Object.values(sensors).map((sensor) => (
                <Table.Tr>
                  <Table.Td align="center">{sensor.name}</Table.Td>
                  <Table.Td align="center">
                    <ActionIcon onClick={() => {console.log(sensor.name)}}>
                      <IconEdit />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          <Button size="xl" fullWidth onClick={() => {setCurrentStep(1)}}>
            Add New
          </Button>
        </Fragment>
      )}

      {currentStep === 1 && (
        <Fragment>
          <Text<'a'> component="a" c="blue" style={{cursor: "pointer"}} onClick={() => {setCurrentStep(0)}}> Back </Text>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Text fw={700}>Add new Sensor</Text>
            <Space h="sm"></Space>
            <TextInput label="Name" placeholder="Thermometer #1">
            </TextInput>
            <NativeSelect label="Model" data={supportedModels}>
            </NativeSelect>
            <TextInput label="Address" placeholder="0x76">
            </TextInput>
          </Card>
            <Button onClick={() => {}}>
              Add Sensor
            </Button>
        </Fragment>
      )}
      </Stack>
    </Fragment>
  );
}
