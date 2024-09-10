import { Box, Paper } from "@mantine/core";
import { getOutputsAsync } from "../../requests/requests_v2";
import { useQuery } from "@tanstack/react-query";

export default function Automations() {
  const getOutputsQuery = useQuery({
    queryKey: ["output-states-accordion"],
    queryFn: () => getOutputsAsync(),
  });


  return (
    <Box pos="relative">
        <Paper shadow="sm" px="md" py="xs" radius="md" withBorder>
          <p>{JSON.stringify(getOutputsQuery.data)}</p>
        </Paper>
      </Box>
        )
}