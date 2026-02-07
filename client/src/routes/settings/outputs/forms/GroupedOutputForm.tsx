import { UseFormReturnType } from "@mantine/form";
import { IOutputBase } from "@sproot/sproot-common/src/outputs/IOutputBase";
import { Fragment, useEffect } from "react";
import { OutputFormValues } from "../OutputSettings";
import { getOutputsAsync } from "../../../../requests/requests_v2";
import { useQuery } from "@tanstack/react-query";
import { Checkbox, SimpleGrid, Paper, ScrollArea, Stack } from "@mantine/core";
import { Models } from "@sproot/sproot-common/src/outputs/Models";

interface GroupedOutputFormProps {
  selectedOutput?: IOutputBase;
  form: UseFormReturnType<OutputFormValues>;
}

export default function GroupedOutputForm({
  selectedOutput,
  form,
}: GroupedOutputFormProps) {
  const outputsQuery = useQuery({
    queryKey: ["outputs"],
    queryFn: () => getOutputsAsync(),
    refetchOnWindowFocus: false,
    refetchInterval: 60000,
  });

  // initialize groupedOutputIds when editing an existing group
  useEffect(() => {
    if (!outputsQuery.data) return;
    if (form.values.groupedOutputIds != null) return;

    const initial = Object.values(outputsQuery.data)
      .filter((o) => o.model !== Models.OUTPUT_GROUP)
      .filter((o) =>
        selectedOutput
          ? o.parentOutputId === selectedOutput.id
          : o.parentOutputId == null,
      )
      .map((o) => o.id as number);

    form.setFieldValue("groupedOutputIds", initial ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outputsQuery.data, selectedOutput]);

  const availableOutputs = Object.values(outputsQuery.data ?? {}).filter(
    (o) => {
      if (o.model === Models.OUTPUT_GROUP) return false;
      if (selectedOutput) {
        return (
          o.parentOutputId === selectedOutput.id || o.parentOutputId == null
        );
      }
      return o.parentOutputId == null;
    },
  );

  const toggle = (id: number) => {
    const current = form.values.groupedOutputIds ?? [];
    if (current.includes(id)) {
      form.setFieldValue(
        "groupedOutputIds",
        current.filter((x) => x !== id),
      );
    } else {
      form.setFieldValue("groupedOutputIds", [...current, id]);
    }
  };

  return (
    <Fragment>
      <Stack pt="xs">
        <Paper withBorder radius="sm" p="sm">
          <ScrollArea style={{ maxHeight: 260 }} type="always">
            {availableOutputs.length === 0 ? null : (
              <SimpleGrid cols={1} spacing="sm">
                {availableOutputs.map((o) => (
                  <Checkbox
                    key={o.id}
                    label={o.name ?? String(o.id)}
                    checked={(form.values.groupedOutputIds ?? []).includes(
                      o.id as number,
                    )}
                    onChange={() => toggle(o.id as number)}
                    disabled={selectedOutput?.id === o.id}
                  />
                ))}
              </SimpleGrid>
            )}
          </ScrollArea>
        </Paper>
      </Stack>
    </Fragment>
  );
}
