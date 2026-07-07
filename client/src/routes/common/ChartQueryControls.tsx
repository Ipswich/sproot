import {
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Switch,
} from "@mantine/core";
import type { Aggregate } from "../../requests/queryTypes";
import {
  CHART_AGGREGATE_OPTIONS,
  CHART_DOWNSAMPLE_OPTIONS,
} from "../../requests/queryTypes";
import PopoverDatePickerInput from "../../components/PopoverDatePickerInput";

interface ChartQueryControlsProps {
  chartInterval: string;
  onChartIntervalChange: (value: string) => void;
  useCustomRange: boolean;
  onUseCustomRangeChange: (value: boolean) => void;
  customRange: { start: Date; end: Date } | null;
  onCustomRangeChange: (value: { start: Date; end: Date } | null) => void;
  aggregate: Aggregate;
  onAggregateChange: (value: Aggregate) => void;
  downsample: string;
  onDownsampleChange: (value: string) => void;
  percentile: number;
  onPercentileChange: (value: number) => void;
}

export default function ChartQueryControls({
  chartInterval,
  onChartIntervalChange,
  useCustomRange,
  onUseCustomRangeChange,
  customRange,
  onCustomRangeChange,
  aggregate,
  onAggregateChange,
  downsample,
  onDownsampleChange,
  percentile,
  onPercentileChange,
}: ChartQueryControlsProps) {
  return (
    <Stack gap="sm" mt="sm">
      <Switch
        checked={useCustomRange}
        onChange={(event) =>
          onUseCustomRangeChange(event.currentTarget.checked)
        }
        label="Custom range"
        size="sm"
      />

      {useCustomRange ? (
        <PopoverDatePickerInput
          type="range"
          size="xs"
          clearable
          placeholder="Select date range"
          value={
            customRange ? [customRange.start, customRange.end] : [null, null]
          }
          onChange={([start, end]) => {
            if (start && end) {
              onCustomRangeChange({ start, end });
              return;
            }

            onCustomRangeChange(null);
          }}
        />
      ) : (
        <SegmentedControl
          value={chartInterval}
          onChange={onChartIntervalChange}
          color="blue"
          fullWidth
          size="xs"
          radius="md"
          data={[
            { label: "6 Hours", value: "6" },
            { label: "12 Hours", value: "12" },
            { label: "1 Day", value: "24" },
            { label: "3 Days", value: "72" },
            { label: "1 Week", value: "0" },
          ]}
        />
      )}

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        <Select
          label="Statistic"
          size="xs"
          allowDeselect={false}
          value={aggregate}
          data={CHART_AGGREGATE_OPTIONS}
          onChange={(value) => {
            if (value) {
              onAggregateChange(value as Aggregate);
            }
          }}
        />
        <Select
          label="Resolution"
          size="xs"
          allowDeselect={false}
          value={downsample}
          data={CHART_DOWNSAMPLE_OPTIONS}
          onChange={(value) => {
            if (value) {
              onDownsampleChange(value);
            }
          }}
        />
      </SimpleGrid>

      {aggregate === "percentile" ? (
        <NumberInput
          label="Percentile"
          description="Uses the server percentile aggregate for the selected range"
          size="xs"
          min={1}
          max={99.9}
          step={1}
          decimalScale={1}
          value={percentile}
          onChange={(value) => {
            if (typeof value === "number" && Number.isFinite(value)) {
              onPercentileChange(value);
            }
          }}
        />
      ) : null}
    </Stack>
  );
}
