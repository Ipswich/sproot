import { useQuery } from "@tanstack/react-query";
import { getSystemStatusAsync } from "../../../requests/requests_v2";
import { Fragment } from "react/jsx-runtime";
import { useEffect } from "react";
import { Table, Title } from "@mantine/core";

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
        <Table
          w="80%"
          variant="vertical"
          layout="fixed"
          withTableBorder
          highlightOnHover
        >
          <Table.Tbody>
            <Table.Tr>
              <Table.Th w={130}>Uptime</Table.Th>
              <Table.Td>
                {(systemStatusQuery.data.uptime / 3600).toFixed(2)} hours
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Th>Memory Usage</Table.Th>
              <Table.Td>
                {systemStatusQuery.data.memoryUsage.toFixed(2)} MB
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Th>Heap Usage</Table.Th>
              <Table.Td>
                {systemStatusQuery.data.heapUsage.toFixed(2)} MB
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Th>CPU Usage</Table.Th>
              <Table.Td>
                {systemStatusQuery.data.cpuUsage.toFixed(2)} %
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Th>Database Size</Table.Th>
              <Table.Td>
                {systemStatusQuery.data.databaseSize.toFixed(2)} MB
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Th>Total Disk Size</Table.Th>
              <Table.Td>
                {(systemStatusQuery.data.totalDiskSize / 1024).toFixed(2)} GB
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Th>Free Disk Size</Table.Th>
              <Table.Td>
                {(systemStatusQuery.data.freeDiskSize / 1024).toFixed(2)} GB
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      )}
    </Fragment>
  );
}
