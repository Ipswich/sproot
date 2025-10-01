import { useQuery } from "@tanstack/react-query";
import { getSystemStatusAsync } from "../../../requests/requests_v2";
import { Fragment } from "react/jsx-runtime";
import { useEffect } from "react";
import { Accordion, Table, Title } from "@mantine/core";
import { IconCpu, IconDatabase, IconLibraryPhoto, IconStack } from "@tabler/icons-react";

export default function SystemStatus() {
  const systemStatusQuery = useQuery({
    queryKey: ["systemStatus"],
    queryFn: () => {
      return getSystemStatusAsync();
    },
  });

  useEffect(() => {
    const interval = setInterval(() => {
      systemStatusQuery.refetch();
    }, 10000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Fragment>
      <Title order={2}>Status</Title>
      {systemStatusQuery.isLoading && <p>Loading...</p>}
      {systemStatusQuery.isError && <p>Error loading system status.</p>}
      {systemStatusQuery.data && (
        <Accordion
          w="90%"
          multiple={true}
        >
          <Accordion.Item value="process">
            <Accordion.Control icon={<IconCpu />}>Process</Accordion.Control>
            <Accordion.Panel>
              <Table
                variant="vertical"
                layout="fixed"
                withTableBorder
                highlightOnHover
              >
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Th w={130}>Uptime</Table.Th>
                    <Table.Td>
                      {(systemStatusQuery.data.process.uptime / 3600).toFixed(2)} hours
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Th>Memory Usage</Table.Th>
                    <Table.Td>
                      {systemStatusQuery.data.process.memoryUsage.toFixed(2)} MB
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Th>Heap Usage</Table.Th>
                    <Table.Td>
                      {systemStatusQuery.data.process.heapUsage.toFixed(2)} MB
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Th>CPU Usage</Table.Th>
                    <Table.Td>
                      {systemStatusQuery.data.process.cpuUsage.toFixed(2)} %
                    </Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="system">
            <Accordion.Control icon={<IconStack />}>System</Accordion.Control>
            <Accordion.Panel>
              <Table
                variant="vertical"
                layout="fixed"
                withTableBorder
                highlightOnHover
              >
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Th>Total Disk Size</Table.Th>
                    <Table.Td>
                      {(systemStatusQuery.data.system.totalDiskSize / 1024).toFixed(2)} GB
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Th>Free Disk Size</Table.Th>
                    <Table.Td>
                      {(systemStatusQuery.data.system.freeDiskSize / 1024).toFixed(2)} GB
                    </Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="database">
            <Accordion.Control icon={<IconDatabase />}>Database</Accordion.Control>
            <Accordion.Panel>
              <Table
                variant="vertical"
                layout="fixed"
                withTableBorder
                highlightOnHover
              >
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Th>Database Size</Table.Th>
                    <Table.Td>
                      {systemStatusQuery.data.database.size.toFixed(2)} MB
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Th>Connections Free</Table.Th>
                    <Table.Td>
                      {systemStatusQuery.data.database.connectionsFree}
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Th>Connections Used</Table.Th>
                    <Table.Td>
                      {systemStatusQuery.data.database.connectionsUsed}
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Th>Pending Acquires</Table.Th>
                    <Table.Td>
                      {systemStatusQuery.data.database.pendingAcquires}
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Th>Pending Creates</Table.Th>
                    <Table.Td>
                      {systemStatusQuery.data.database.pendingCreates}
                    </Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="timelapse">
            <Accordion.Control icon={<IconLibraryPhoto />}>Timelapse</Accordion.Control>
            <Accordion.Panel>
              <Table
                variant="vertical"
                layout="fixed"
                withTableBorder
                highlightOnHover
              >
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Th>Image Count</Table.Th>
                    <Table.Td>
                      {(systemStatusQuery.data.timelapse.imageCount ?? 0)}
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Th>Archive Size</Table.Th>
                    <Table.Td>
                      {(systemStatusQuery.data.timelapse.directorySize ?? 0).toFixed(2)} MB
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Th>Generation Duration</Table.Th>
                    <Table.Td>
                      {(systemStatusQuery.data.timelapse.lastArchiveGenerationDuration ?? 0).toFixed(2)} Seconds
                    </Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      )}
    </Fragment>
  );
}


