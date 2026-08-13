import { useEffect, useState } from "react";
import { useForm } from "@mantine/form";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Accordion,
  Alert,
  Box,
  Button,
  Group,
  LoadingOverlay,
  NumberInput,
  Paper,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconClockCancel,
  IconDeviceFloppy,
  IconRefresh,
} from "@tabler/icons-react";
import {
  ApplicationSettings,
  getApplicationSettingsAsync,
  patchApplicationSettingsAsync,
} from "../../../requests/requests_v2";

type RetentionUnit = "days" | "weeks" | "months" | "years";
type RetentionMode = "forever" | "finite";

type RetentionControlValue = {
  mode: RetentionMode;
  amount: number;
  unit: RetentionUnit;
};

type SettingsFormValues = {
  sensors: RetentionControlValue;
  outputs: RetentionControlValue;
  system: {
    backup_retention: RetentionControlValue;
    latitude: string;
    longitude: string;
  };
};

type SettingsSection = {
  title: string;
  description: string;
  path: "sensors" | "outputs" | "system.backup_retention";
};

const retentionUnits: Array<{ value: RetentionUnit; label: string }> = [
  { value: "days", label: "Days" },
  { value: "weeks", label: "Weeks" },
  { value: "months", label: "Months" },
  { value: "years", label: "Years" },
];

const sections: SettingsSection[] = [
  {
    title: "Sensor Data",
    description: "Duration to store sensor reading history before deletion.",
    path: "sensors",
  },
  {
    title: "Output Data",
    description: "Duration to store output state history before deletion.",
    path: "outputs",
  },
];

function createDefaultRetentionValue(): RetentionControlValue {
  return {
    mode: "forever",
    amount: 30,
    unit: "days",
  };
}

function parseRetentionValue(
  value: string | null | undefined,
): RetentionControlValue {
  if (!value) {
    return createDefaultRetentionValue();
  }

  const match = value
    .trim()
    .toLowerCase()
    .match(/^(\d+)\s*(day(?:s)?|week(?:s)?|month(?:s)?|year(?:s)?)$/);

  if (!match) {
    return createDefaultRetentionValue();
  }

  const amount = Number(match[1]);
  const unitToken = match[2];

  let unit: RetentionUnit = "days";
  if (unitToken?.startsWith("week")) {
    unit = "weeks";
  } else if (unitToken?.startsWith("month")) {
    unit = "months";
  } else if (unitToken?.startsWith("year")) {
    unit = "years";
  }

  return {
    mode: "finite",
    amount: Number.isFinite(amount) && amount > 0 ? amount : 30,
    unit,
  };
}

function serializeRetentionValue(value: RetentionControlValue): string | null {
  if (value.mode === "forever") {
    return null;
  }

  const amount = Math.max(1, Math.floor(value.amount));
  return `${amount} ${value.unit}`;
}

function serializeCoordinateValue(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function toFormValues(settings: ApplicationSettings): SettingsFormValues {
  return {
    sensors: parseRetentionValue(settings["sensors.data_retention"]),
    outputs: parseRetentionValue(settings["outputs.data_retention"]),
    system: {
      backup_retention: parseRetentionValue(
        settings["system.backup_retention"],
      ),
      latitude: settings["system.latitude"] ?? "",
      longitude: settings["system.longitude"] ?? "",
    },
  };
}

function toRequestBody(values: SettingsFormValues): ApplicationSettings {
  return {
    "sensors.data_retention": serializeRetentionValue(values.sensors),
    "outputs.data_retention": serializeRetentionValue(values.outputs),
    "system.backup_retention": serializeRetentionValue(
      values.system.backup_retention,
    ),
    "system.latitude": serializeCoordinateValue(values.system.latitude),
    "system.longitude": serializeCoordinateValue(values.system.longitude),
  };
}

function getChangedSettings(
  currentValues: SettingsFormValues,
  baselineValues: SettingsFormValues,
): ApplicationSettings {
  const currentSettings = toRequestBody(currentValues);
  const baselineSettings = toRequestBody(baselineValues);

  return Object.fromEntries(
    Object.entries(currentSettings).filter(([key, value]) => {
      return baselineSettings[key as keyof ApplicationSettings] !== value;
    }),
  ) as ApplicationSettings;
}

function hasChanges(
  currentValues: SettingsFormValues,
  baselineValues: SettingsFormValues | null,
): boolean {
  if (!baselineValues) {
    return false;
  }

  return (
    Object.keys(getChangedSettings(currentValues, baselineValues)).length > 0
  );
}

export default function ApplicationSettingsAccordionItem() {
  const [baselineValues, setBaselineValues] =
    useState<SettingsFormValues | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const settingsQuery = useQuery({
    queryKey: ["applicationSettings"],
    queryFn: () => getApplicationSettingsAsync(),
  });

  const form = useForm<SettingsFormValues>({
    initialValues: {
      sensors: createDefaultRetentionValue(),
      outputs: createDefaultRetentionValue(),
      system: {
        backup_retention: createDefaultRetentionValue(),
        latitude: "",
        longitude: "",
      },
    },
    validate: (values) => {
      const errors: Record<string, string> = {};

      const finiteControls: Array<[string, RetentionControlValue]> = [
        ["sensors.amount", values.sensors],
        ["outputs.amount", values.outputs],
        ["system.backup_retention.amount", values.system.backup_retention],
      ];

      finiteControls.forEach(([path, value]) => {
        if (
          value.mode === "finite" &&
          (!Number.isFinite(value.amount) || value.amount < 1)
        ) {
          errors[path] = "Enter a retention period greater than zero.";
        }
      });

      if (values.system.latitude.trim() !== "") {
        const latitude = Number(values.system.latitude);
        if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
          errors["system.latitude"] = "Enter a latitude between -90 and 90.";
        }
      }

      if (values.system.longitude.trim() !== "") {
        const longitude = Number(values.system.longitude);
        if (
          !Number.isFinite(longitude) ||
          longitude < -180 ||
          longitude > 180
        ) {
          errors["system.longitude"] =
            "Enter a longitude between -180 and 180.";
        }
      }

      return errors;
    },
  });

  const settingsMutation = useMutation({
    mutationFn: async (values: SettingsFormValues) => {
      if (!baselineValues) {
        return null;
      }

      const changedSettings = getChangedSettings(values, baselineValues);
      if (Object.keys(changedSettings).length === 0) {
        return null;
      }

      return patchApplicationSettingsAsync(changedSettings);
    },
    onSuccess: async () => {
      const refreshedSettings = await settingsQuery.refetch();
      const nextValues = toFormValues(refreshedSettings.data ?? {});

      setBaselineValues(nextValues);
      form.setValues(nextValues);
      setSaveError(null);
      setSaveMessage("Application settings updated.");
    },
    onError: (error) => {
      setSaveMessage(null);
      setSaveError(
        error instanceof Error
          ? error.message
          : "Failed to update application settings.",
      );
    },
  });

  useEffect(() => {
    if (!settingsQuery.data) {
      return;
    }

    const nextValues = toFormValues(settingsQuery.data);
    setBaselineValues(nextValues);
    form.setValues(nextValues);
    setSaveError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsQuery.data]);

  const dirty = hasChanges(form.values, baselineValues);

  const handleReset = () => {
    if (!baselineValues) {
      return;
    }

    form.setValues(baselineValues);
    setSaveMessage(null);
    setSaveError(null);
  };

  function getRetentionValue(
    values: SettingsFormValues,
    path: SettingsSection["path"],
  ): RetentionControlValue {
    if (path === "sensors") {
      return values.sensors;
    }

    if (path === "outputs") {
      return values.outputs;
    }

    return values.system.backup_retention;
  }

  function setRetentionMode(
    path: SettingsSection["path"],
    mode: RetentionMode,
  ) {
    if (path === "sensors") {
      form.setFieldValue("sensors.mode", mode);
      return;
    }

    if (path === "outputs") {
      form.setFieldValue("outputs.mode", mode);
      return;
    }

    form.setFieldValue("system.backup_retention.mode", mode);
  }

  function setRetentionAmount(path: SettingsSection["path"], amount: number) {
    if (path === "sensors") {
      form.setFieldValue("sensors.amount", amount);
      return;
    }

    if (path === "outputs") {
      form.setFieldValue("outputs.amount", amount);
      return;
    }

    form.setFieldValue("system.backup_retention.amount", amount);
  }

  function setRetentionUnit(
    path: SettingsSection["path"],
    unit: RetentionUnit,
  ) {
    if (path === "sensors") {
      form.setFieldValue("sensors.unit", unit);
      return;
    }

    if (path === "outputs") {
      form.setFieldValue("outputs.unit", unit);
      return;
    }

    form.setFieldValue("system.backup_retention.unit", unit);
  }

  return (
    <Accordion.Item value="application-settings">
      <Accordion.Control>
        <Group pl={"xl"}>
          <IconClockCancel />
          <Title order={3} fw={450}>
            Application Settings
          </Title>
        </Group>
      </Accordion.Control>
      <Accordion.Panel>
        <Box pos="relative">
          <LoadingOverlay
            visible={settingsQuery.isLoading || settingsMutation.isPending}
            zIndex={1000}
            loaderProps={{ color: "teal", type: "bars", size: "lg" }}
          />
          <form
            onSubmit={form.onSubmit((values) => {
              setSaveMessage(null);
              setSaveError(null);
              settingsMutation.mutate(values);
            })}
          >
            <Stack gap="lg">
              {settingsQuery.isError && (
                <Alert color="red" title="Could not load settings">
                  {settingsQuery.error instanceof Error
                    ? settingsQuery.error.message
                    : "The settings endpoint did not return usable data."}
                </Alert>
              )}

              <SimpleGrid
                cols={{ base: 1, md: 3 }}
                spacing="lg"
                verticalSpacing="lg"
              >
                {sections.map((section) => (
                  <Paper
                    key={section.title}
                    withBorder
                    radius="md"
                    p="lg"
                    shadow="xs"
                  >
                    <Stack gap="md">
                      <div>
                        <Text fw={600}>{section.title}</Text>
                        <Text size="sm" c="dimmed">
                          {section.description}
                        </Text>
                      </div>

                      <SegmentedControl
                        fullWidth
                        radius="md"
                        data={[
                          { label: "Forever", value: "forever" },
                          { label: "Custom", value: "finite" },
                        ]}
                        value={
                          getRetentionValue(form.values, section.path).mode
                        }
                        onChange={(value) => {
                          if (value === "forever" || value === "finite") {
                            setRetentionMode(section.path, value);
                          }
                        }}
                      />

                      <div
                        style={{
                          overflow: "hidden",
                          maxHeight:
                            getRetentionValue(form.values, section.path)
                              .mode === "finite"
                              ? "120px"
                              : "0px",
                          opacity:
                            getRetentionValue(form.values, section.path)
                              .mode === "finite"
                              ? 1
                              : 0,
                          transition: "max-height 0.2s ease, opacity 0.2s ease",
                        }}
                      >
                        <SimpleGrid cols={{ base: 2 }} spacing="sm">
                          <NumberInput
                            label="Retention period"
                            min={1}
                            allowNegative={false}
                            allowDecimal={false}
                            value={
                              getRetentionValue(form.values, section.path)
                                .amount
                            }
                            error={
                              section.path === "sensors"
                                ? form.errors["sensors.amount"]
                                : section.path === "outputs"
                                  ? form.errors["outputs.amount"]
                                  : form.errors[
                                      "system.backup_retention.amount"
                                    ]
                            }
                            onChange={(value) => {
                              if (
                                typeof value === "number" &&
                                Number.isFinite(value)
                              ) {
                                setRetentionAmount(section.path, value);
                              }
                            }}
                          />
                          <Select
                            label="Unit"
                            searchable={false}
                            allowDeselect={false}
                            styles={{
                              input: {
                                cursor: "pointer",
                                caretColor: "transparent",
                              },
                            }}
                            data={retentionUnits}
                            value={
                              getRetentionValue(form.values, section.path).unit
                            }
                            onChange={(value) => {
                              if (
                                value === "days" ||
                                value === "weeks" ||
                                value === "months" ||
                                value === "years"
                              ) {
                                setRetentionUnit(section.path, value);
                              }
                            }}
                          />
                        </SimpleGrid>
                      </div>
                    </Stack>
                  </Paper>
                ))}
              </SimpleGrid>

              <Paper withBorder radius="md" p="lg" shadow="xs">
                <Stack gap="md">
                  <div>
                    <Text fw={600}>Solar And Lunar Timing</Text>
                    <Text size="sm" c="dimmed">
                      Latitude and longitude are used to calculate dynamic
                      sunrise, sunset, moonrise, moonset, and related automation
                      time points.
                    </Text>
                  </div>
                  <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
                    <TextInput
                      label="Latitude"
                      placeholder="40.7128"
                      value={form.values.system.latitude}
                      error={form.errors["system.latitude"]}
                      onChange={(event) =>
                        form.setFieldValue(
                          "system.latitude",
                          event.currentTarget.value,
                        )
                      }
                    />
                    <TextInput
                      label="Longitude"
                      placeholder="-74.0060"
                      value={form.values.system.longitude}
                      error={form.errors["system.longitude"]}
                      onChange={(event) =>
                        form.setFieldValue(
                          "system.longitude",
                          event.currentTarget.value,
                        )
                      }
                    />
                  </SimpleGrid>
                  <Text size="sm" c="dimmed">
                    Leave either field blank to disable solar and lunar
                    automation time points.
                  </Text>
                </Stack>
              </Paper>

              {saveError && (
                <Alert color="red" title="Save failed">
                  {saveError}
                </Alert>
              )}

              {saveMessage && !saveError && (
                <Alert color="teal" title="Saved">
                  {saveMessage}
                </Alert>
              )}

              <Group justify="space-between" align="center">
                <Text size="sm" c={dirty ? "yellow.7" : "dimmed"}>
                  {dirty
                    ? "You have unsaved changes."
                    : "Settings are in sync with the server."}
                </Text>
                <Group>
                  <Button
                    variant="default"
                    leftSection={<IconRefresh size={16} />}
                    onClick={handleReset}
                    disabled={!dirty || settingsMutation.isPending}
                  >
                    Reset
                  </Button>
                  <Button
                    variant="light"
                    type="submit"
                    leftSection={<IconDeviceFloppy size={16} />}
                    loading={settingsMutation.isPending}
                    disabled={!dirty || settingsQuery.isLoading}
                  >
                    Save settings
                  </Button>
                </Group>
              </Group>
            </Stack>
          </form>
        </Box>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
