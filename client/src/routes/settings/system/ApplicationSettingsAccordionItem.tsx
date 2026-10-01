import { useEffect, useState } from "react";
import { useForm } from "@mantine/form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Accordion,
  Alert,
  Box,
  Button,
  Group,
  LoadingOverlay,
  NumberInput,
  Paper,
  PasswordInput,
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
  clearAuthenticationToken,
  changePasswordAsync,
  createFirstUserAsync,
  getAuthenticationStateAsync,
  getApplicationSettingsAsync,
  patchApplicationSettingsAsync,
  setAuthenticationToken,
} from "../../../requests/requests_v2";
import { clearRootLoaderCache } from "../../utility/Loaders";

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
    authentication_enabled: boolean;
    force_https: boolean;
    log_debug: boolean;
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
  {
    title: "Backups",
    description: "Duration to store backup files before deletion.",
    path: "system.backup_retention",
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
      authentication_enabled: settings["system.authentication_enabled"] === true,
      force_https: settings["system.force_https"] === true,
      log_debug: settings["system.log_debug"] === true,
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
    "system.authentication_enabled": values.system.authentication_enabled,
    "system.force_https": values.system.force_https,
    "system.log_debug": values.system.log_debug,
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
  const queryClient = useQueryClient();
  const [baselineValues, setBaselineValues] =
    useState<SettingsFormValues | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [setupValues, setSetupValues] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [setupErrors, setSetupErrors] = useState<Record<string, string>>({});
  const [passwordValues, setPasswordValues] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const settingsQuery = useQuery({
    queryKey: ["applicationSettings"],
    queryFn: () => getApplicationSettingsAsync(),
  });

  const authStateQuery = useQuery({
    queryKey: ["authenticationState", "applicationSettings"],
    queryFn: () => getAuthenticationStateAsync(),
  });

  const passwordMutation = useMutation({
    mutationFn: () =>
      changePasswordAsync(
        passwordValues.newPassword,
        authStateQuery.data?.authenticationEnabled
          ? passwordValues.currentPassword
          : undefined,
      ),
    onSuccess: () => {
      if (authStateQuery.data?.authenticationEnabled) {
        clearAuthenticationToken();
        clearRootLoaderCache();
        window.location.assign("/login");
        return;
      }

      setPasswordError(null);
      setPasswordMessage("Password updated.");
      setPasswordValues({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
    },
    onError: (error) => {
      setPasswordMessage(null);
      setPasswordError(
        error instanceof Error ? error.message : "Failed to change the password.",
      );
    },
  });

  function validateFirstUserSetup(): boolean {
    const nextErrors: Record<string, string> = {};

    if (!setupValues.username.trim()) {
      nextErrors["username"] = "Username is required.";
    }

    if (!setupValues.password) {
      nextErrors["password"] = "Password is required.";
    }

    if (setupValues.password !== setupValues.confirmPassword) {
      nextErrors["confirmPassword"] = "Passwords do not match.";
    }

    setSetupErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  const form = useForm<SettingsFormValues>({
    initialValues: {
      sensors: createDefaultRetentionValue(),
      outputs: createDefaultRetentionValue(),
      system: {
        backup_retention: createDefaultRetentionValue(),
        authentication_enabled: false,
        force_https: false,
        log_debug: false,
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
        return { redirectToLogin: false, logoutAfterSave: false };
      }

      const changedSettings = getChangedSettings(values, baselineValues);
      if (Object.keys(changedSettings).length === 0) {
        return { redirectToLogin: false, logoutAfterSave: false };
      }

      const needsFirstUserSetup =
        changedSettings["system.authentication_enabled"] === true &&
        (authStateQuery.data?.userCount ?? 0) < 1;

      const settingsPayload = { ...changedSettings };

      if (needsFirstUserSetup) {
        if (!validateFirstUserSetup()) {
          throw new Error("Create the first user before enabling authentication.");
        }

        delete settingsPayload["system.authentication_enabled"];
      }

      if (Object.keys(settingsPayload).length > 0) {
        await patchApplicationSettingsAsync(settingsPayload);
      }

      if (needsFirstUserSetup) {
        const setupResult = await createFirstUserAsync({
          username: setupValues.username.trim(),
          password: setupValues.password,
          enableAuthentication: true,
        });

        if (setupResult["csrf-token"]) {
          setAuthenticationToken(setupResult["csrf-token"]);
        }

        return { redirectToLogin: false, logoutAfterSave: false };
      }

      const logoutAfterSave =
        changedSettings["system.authentication_enabled"] === false &&
        (authStateQuery.data?.authenticationEnabled ?? false);

      return {
        redirectToLogin:
          changedSettings["system.authentication_enabled"] === true &&
          (authStateQuery.data?.userCount ?? 0) > 0,
        logoutAfterSave,
      };
    },
    onSuccess: async (result) => {
      if (result.redirectToLogin) {
        clearRootLoaderCache();
        window.location.assign("/login");
        return;
      }

      if (result.logoutAfterSave) {
        clearAuthenticationToken();
        clearRootLoaderCache();
        setPasswordValues({
          currentPassword: "",
          newPassword: "",
          confirmNewPassword: "",
        });
      }

      const [refreshedSettings] = await Promise.all([
        settingsQuery.refetch(),
        authStateQuery.refetch(),
        queryClient.invalidateQueries({ queryKey: ["authenticationState"] }),
      ]);
      const nextValues = toFormValues(refreshedSettings.data ?? {});

      setBaselineValues(nextValues);
      form.setValues(nextValues);
      setSetupErrors({});
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
                    <Text fw={600}>HTTPS Enforcement</Text>
                    <Text size="sm" c="dimmed">
                      When enabled, login and authenticated API requests are blocked over HTTP and must use https://.
                    </Text>
                  </div>

                  <SegmentedControl
                    fullWidth
                    radius="md"
                    data={[
                      { label: "Allow HTTP", value: "false" },
                      { label: "Require HTTPS", value: "true" },
                    ]}
                    value={form.values.system.force_https ? "true" : "false"}
                    onChange={(value) => {
                      form.setFieldValue("system.force_https", value === "true");
                    }}
                  />

                  {form.values.system.force_https && (
                    <Alert color="yellow" title="Self-signed certificate warning">
                      Browsers will continue to warn until the generated certificate is trusted by the device or browser.
                    </Alert>
                  )}
                </Stack>
              </Paper>

              <Paper withBorder radius="md" p="lg" shadow="xs">
                <Stack gap="md">
                  <div>
                    <Text fw={600}>Debug Logging</Text>
                    <Text size="sm" c="dimmed">
                      Toggle verbose server logging.
                    </Text>
                  </div>

                  <SegmentedControl
                    fullWidth
                    radius="md"
                    data={[
                      { label: "Off", value: "false" },
                      { label: "On", value: "true" },
                    ]}
                    value={form.values.system.log_debug ? "true" : "false"}
                    onChange={(value) => {
                      form.setFieldValue("system.log_debug", value === "true");
                    }}
                  />
                </Stack>
              </Paper>

              <Paper withBorder radius="md" p="lg" shadow="xs">
                <Stack gap="md">
                  <div>
                    <Text fw={600}>Authentication</Text>
                    <Text size="sm" c="dimmed">
                      Require a user account and password to access the app.
                    </Text>
                  </div>

                  <SegmentedControl
                    fullWidth
                    radius="md"
                    data={[
                      { label: "Off", value: "false" },
                      { label: "On", value: "true" },
                    ]}
                    value={
                      form.values.system.authentication_enabled ? "true" : "false"
                    }
                    onChange={(value) => {
                      form.setFieldValue(
                        "system.authentication_enabled",
                        value === "true",
                      );
                    }}
                  />

                  {form.values.system.authentication_enabled &&
                    (authStateQuery.data?.userCount ?? 0) < 1 && (
                      <Stack gap="sm">
                        <Alert color="yellow" title="Create the first user">
                          Authentication cannot be enabled until the first user is created.
                        </Alert>
                        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
                          <TextInput
                            label="Username"
                            value={setupValues.username}
                            error={setupErrors["username"]}
                            onChange={(event) => {
                              const nextValue = event.currentTarget.value;
                              setSetupValues((current) => ({
                                ...current,
                                username: nextValue,
                              }));
                              setSetupErrors((current) => ({
                                ...current,
                                username: "",
                              }));
                            }}
                          />
                          <PasswordInput
                            label="Password"
                            value={setupValues.password}
                            error={setupErrors["password"]}
                            onChange={(event) => {
                              const nextValue = event.currentTarget.value;
                              setSetupValues((current) => ({
                                ...current,
                                password: nextValue,
                              }));
                              setSetupErrors((current) => ({
                                ...current,
                                password: "",
                              }));
                            }}
                          />
                          <PasswordInput
                            label="Confirm password"
                            value={setupValues.confirmPassword}
                            error={setupErrors["confirmPassword"]}
                            onChange={(event) => {
                              const nextValue = event.currentTarget.value;
                              setSetupValues((current) => ({
                                ...current,
                                confirmPassword: nextValue,
                              }));
                              setSetupErrors((current) => ({
                                ...current,
                                confirmPassword: "",
                              }));
                            }}
                          />
                        </SimpleGrid>
                      </Stack>
                    )}

                  {form.values.system.authentication_enabled &&
                    authStateQuery.data?.authenticationEnabled &&
                    (authStateQuery.data?.userCount ?? 0) > 0 && (
                    <Stack gap="md" pt="xs">
                      <div>
                        <Text fw={600}>Password</Text>
                        <Text size="sm" c="dimmed">
                          Change the login password.
                        </Text>
                      </div>

                      {authStateQuery.data?.authenticationEnabled && (
                        <PasswordInput
                          label="Current password"
                          value={passwordValues.currentPassword}
                          onChange={(event) => {
                            const nextValue = event.currentTarget.value;
                            setPasswordValues((current) => ({
                              ...current,
                              currentPassword: nextValue,
                            }));
                          }}
                        />
                      )}

                      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
                        <PasswordInput
                          label="New password"
                          value={passwordValues.newPassword}
                          onChange={(event) => {
                            const nextValue = event.currentTarget.value;
                            setPasswordValues((current) => ({
                              ...current,
                              newPassword: nextValue,
                            }));
                          }}
                        />
                        <PasswordInput
                          label="Confirm new password"
                          value={passwordValues.confirmNewPassword}
                          onChange={(event) => {
                            const nextValue = event.currentTarget.value;
                            setPasswordValues((current) => ({
                              ...current,
                              confirmNewPassword: nextValue,
                            }));
                          }}
                        />
                      </SimpleGrid>

                      {passwordError && (
                        <Alert color="red" title="Password update failed">
                          {passwordError}
                        </Alert>
                      )}

                      {passwordMessage && !passwordError && (
                        <Alert color="teal" title="Password updated">
                          {passwordMessage}
                        </Alert>
                      )}

                      <Button
                        variant="light"
                        loading={passwordMutation.isPending}
                        onClick={() => {
                          setPasswordError(null);
                          setPasswordMessage(null);

                          if (!passwordValues.newPassword) {
                            setPasswordError("Enter a new password.");
                            return;
                          }

                          if (
                            passwordValues.newPassword !==
                            passwordValues.confirmNewPassword
                          ) {
                            setPasswordError("New passwords do not match.");
                            return;
                          }

                          if (
                            authStateQuery.data?.authenticationEnabled &&
                            !passwordValues.currentPassword
                          ) {
                            setPasswordError("Enter the current password.");
                            return;
                          }

                          passwordMutation.mutate();
                        }}
                      >
                        Change password
                      </Button>
                    </Stack>
                  )}
                </Stack>
              </Paper>

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
