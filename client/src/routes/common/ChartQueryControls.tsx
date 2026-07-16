import {
  ComboboxItem,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
} from "@mantine/core";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const knownDownsampleValues = useMemo(
    () =>
      new Set<string>(CHART_DOWNSAMPLE_OPTIONS.map((option) => option.value)),
    [],
  );
  const usesCustomDownsample =
    downsample !== "auto" && !knownDownsampleValues.has(downsample);
  const [customDownsampleAmount, setCustomDownsampleAmount] = useState(15);
  const [customDownsampleUnit, setCustomDownsampleUnit] = useState<
    "minutes" | "hours" | "days"
  >("minutes");
  const [showCustomResolutionEditor, setShowCustomResolutionEditor] =
    useState(usesCustomDownsample);

  useEffect(() => {
    if (customRange === null && rangeSelectionRef.current.hasClearedRef) {
      onCustomRangeChange(null);
    }
    rangeSelectionRef.current.hasClearedRef = customRange === null;
  }, [customRange, onCustomRangeChange]);

  useEffect(() => {
    setShowCustomResolutionEditor(usesCustomDownsample);
  }, [usesCustomDownsample]);

  useEffect(() => {
    if (!usesCustomDownsample) {
      return;
    }

    const match = downsample
      .trim()
      .toLowerCase()
      .match(/^(\d+)\s*(minute(?:s)?|hour(?:s)?|day(?:s)?|m|h|d)$/);

    if (!match) {
      return;
    }

    setCustomDownsampleAmount(Number(match[1]));
    const unit = match[2];
    if (unit?.startsWith("hour") || unit === "h") {
      setCustomDownsampleUnit("hours");
      return;
    }
    if (unit?.startsWith("day") || unit === "d") {
      setCustomDownsampleUnit("days");
      return;
    }
    setCustomDownsampleUnit("minutes");
  }, [downsample, usesCustomDownsample]);

  const selectedPresetOrCustom = useCustomRange
    ? "custom-range"
    : chartInterval;
  const resolutionOptions: ComboboxItem[] = [
    ...CHART_DOWNSAMPLE_OPTIONS,
    { value: "custom-resolution", label: "Custom..." },
  ];

  const selectedResolutionValue = usesCustomDownsample
    ? "custom-resolution"
    : downsample;

  const rangeSelectionRef = useRef<{ hasClearedRef: boolean }>({
    hasClearedRef: false,
  });

  function emitCustomDownsample(
    amount: number,
    unit: "minutes" | "hours" | "days",
  ) {
    const nextValue = `${amount} ${unit}`;
    onDownsampleChange(nextValue);
  }

  return (
    <Stack gap="0" mt="sm" mb="xs">
      <SegmentedControl
        value={selectedPresetOrCustom}
        onChange={(value) => {
          if (value === "custom-range") {
            onUseCustomRangeChange(true);
            return;
          }

          onUseCustomRangeChange(false);
          onChartIntervalChange(value);
        }}
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
          { label: "Custom", value: "custom-range" },
        ]}
      />

      <div
        style={{
          overflow: "hidden",
          maxHeight: useCustomRange ? "100px" : "0px",
          opacity: useCustomRange ? 1 : 0,
          transition: "max-height 0.2s ease, opacity 0.2s ease",
          marginBottom: useCustomRange ? undefined : 0,
        }}
      >
        <PopoverDatePickerInput
          key={
            customRange
              ? `${customRange.start.getTime()}-${customRange.end.getTime()}`
              : "empty"
          }
          type="range"
          size="sm"
          clearable
          placeholder="Select date range"
          autocomplete="off"
          value={
            customRange ? [customRange.start, customRange.end] : [null, null]
          }
          onChange={([start, end]) => {
            if (start && end) {
              onCustomRangeChange({ start, end });
              return;
            }

            if (!start && !end) {
              onCustomRangeChange(null);
              return;
            }
          }}
        />
      </div>

      <SimpleGrid cols={{ base: 2 }} spacing="sm">
        <Select
          label="Statistic"
          size="xs"
          allowDeselect={false}
          searchable={false}
          styles={{ input: { cursor: "pointer", caretColor: "transparent" } }}
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
          searchable={false}
          styles={{ input: { cursor: "pointer", caretColor: "transparent" } }}
          value={selectedResolutionValue}
          data={resolutionOptions}
          onChange={(value) => {
            if (value) {
              if (value === "custom-resolution") {
                setShowCustomResolutionEditor(true);
                emitCustomDownsample(
                  customDownsampleAmount,
                  customDownsampleUnit,
                );
                return;
              }

              setShowCustomResolutionEditor(false);
              onDownsampleChange(value);
            }
          }}
        />
      </SimpleGrid>

      <div
        style={{
          overflow: "hidden",
          maxHeight: showCustomResolutionEditor ? "120px" : "0px",
          opacity: showCustomResolutionEditor ? 1 : 0,
          transition: "max-height 0.2s ease, opacity 0.2s ease",
          marginBottom: showCustomResolutionEditor ? undefined : 0,
        }}
      >
        <SimpleGrid cols={{ base: 2 }} spacing="sm">
          <NumberInput
            label="Custom resolution"
            size="xs"
            min={1}
            autocomplete="off"
            value={customDownsampleAmount}
            onChange={(value) => {
              if (typeof value === "number" && Number.isFinite(value)) {
                setCustomDownsampleAmount(value);
                emitCustomDownsample(value, customDownsampleUnit);
              }
            }}
          />
          <Select
            label="Unit"
            size="xs"
            searchable={false}
            allowDeselect={false}
            styles={{ input: { cursor: "pointer", caretColor: "transparent" } }}
            value={customDownsampleUnit}
            data={[
              { value: "minutes", label: "Minutes" },
              { value: "hours", label: "Hours" },
              { value: "days", label: "Days" },
            ]}
            onChange={(value) => {
              if (
                value === "minutes" ||
                value === "hours" ||
                value === "days"
              ) {
                setCustomDownsampleUnit(value);
                emitCustomDownsample(customDownsampleAmount, value);
              }
            }}
          />
        </SimpleGrid>
      </div>

      <div
        style={{
          overflow: "hidden",
          maxHeight: aggregate === "percentile" ? "60px" : "0px",
          opacity: aggregate === "percentile" ? 1 : 0,
          transition: "max-height 0.2s ease, opacity 0.2s ease",
          marginBottom: aggregate === "percentile" ? undefined : 0,
        }}
      >
        <NumberInput
          label="Percentile"
          size="xs"
          min={1}
          max={99.9}
          step={1}
          decimalScale={1}
          autocomplete="off"
          value={percentile}
          onChange={(value) => {
            if (typeof value === "number" && Number.isFinite(value)) {
              onPercentileChange(value);
            }
          }}
        />
      </div>
    </Stack>
  );
}
