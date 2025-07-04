import { Fragment, useEffect } from "react";
import {
  Text,
  Button,
  Group,
  NumberInput,
  Stack,
  TextInput,
  rem,
  Fieldset,
  Switch,
  LoadingOverlay,
} from "@mantine/core";
import {
  getCameraSettingsAsync,
  updateCameraSettingsAsync,
} from "@sproot/sproot-client/src/requests/requests_v2";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "@mantine/form";
import { TimeInput } from "@mantine/dates";
import { SDBCameraSettings } from "@sproot/database/SDBCameraSettings";

export interface FormValues {
  id?: number;
  name: string;
  enabled: boolean;
  imageRetentionDays: number;
  imageRetentionSize: number;
  timelapseEnabled: boolean;
  timelapseInterval: number | null;
  timelapseStartTime: string | null;
  timelapseEndTime: string | null;
}

export default function OutputSettings() {
  const regex = /^([01][0-9]|2[0-3]):([0-5][0-9])$/;
  const getCameraSettingsQuery = useQuery({
    queryKey: ["cameraSettings"],
    queryFn: () => getCameraSettingsAsync(),
    refetchInterval: 60000,
  });

  const updateCameraSettingsMutation = useMutation({
    mutationFn: async (newCameraSettings: FormValues) => {
      const updatedSettings = { ...newCameraSettings };

      if (updatedSettings.timelapseStartTime === "") {
        updatedSettings.timelapseStartTime = null;
      }
      if (updatedSettings.timelapseEndTime === "") {
        updatedSettings.timelapseEndTime = null;
      }

      await updateCameraSettingsAsync(updatedSettings as SDBCameraSettings);
    },
    onSettled: () => {
      getCameraSettingsQuery.refetch();
    },
  });

  const newCameraForm = useForm({
    initialValues: {
      name: "",
      enabled: false,
      imageRetentionDays: 0,
      imageRetentionSize: 0,
      timelapseEnabled: false,
      timelapseInterval: null,
      timelapseStartTime: "",
      timelapseEndTime: "",
    } as FormValues,

    validate: {
      name: (value: string) =>
        !value || (value.length > 0 && value.length <= 64)
          ? null
          : "Name must be between 1 and 64 characters",
      enabled: (value: boolean) =>
        typeof value === "boolean" ? null : "Enabled must be true or false",
      imageRetentionDays: (value: number) =>
        value > 0 ? null : "Image Retention Days must be a positive number",
      imageRetentionSize: (value: number) =>
        value > 0 ? null : "Image Retention Size must be a positive number",
      timelapseEnabled: (value: boolean) =>
        typeof value === "boolean"
          ? null
          : "Timelapse Enabled must be true or false",
      timelapseInterval: (value: number | null) =>
        value === null || (value > 0 && value <= 1440)
          ? null
          : "Timelapse Interval must be a positive number up to 1440 minutes (24 hours)",
      timelapseStartTime: (value: string | null) =>
        value === "" || value === null || (value && regex.test(value))
          ? null
          : "Timelapse Start Time must be null or proper time format (HH:MM)",
      timelapseEndTime: (value: string | null) =>
        value === "" || value === null || (value && regex.test(value))
          ? null
          : "Timelapse End Time must be null or proper time format (HH:MM)",
    },
  });

  // Update form values when data is fetched
  useEffect(() => {
    if (getCameraSettingsQuery.data) {
      newCameraForm.setValues({
        name: getCameraSettingsQuery.data.name || "",
        enabled: getCameraSettingsQuery.data.enabled || false,
        imageRetentionDays: getCameraSettingsQuery.data.imageRetentionDays || 0,
        imageRetentionSize: getCameraSettingsQuery.data.imageRetentionSize || 0,
        timelapseEnabled: getCameraSettingsQuery.data.timelapseEnabled || false,
        timelapseInterval:
          getCameraSettingsQuery.data.timelapseInterval || null,
        timelapseStartTime:
          getCameraSettingsQuery.data.timelapseStartTime || "",
        timelapseEndTime: getCameraSettingsQuery.data.timelapseEndTime || "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getCameraSettingsQuery.data]);

  // Handle form submission
  const handleSubmit = (values: FormValues) => {
    updateCameraSettingsMutation.mutate(values);
  };

  return (
    <Fragment>
      <Stack h="600" justify="center" align="center" pos="relative">
        <LoadingOverlay
          visible={
            getCameraSettingsQuery.isLoading ||
            updateCameraSettingsMutation.isPending
          }
          zIndex={1000}
          loaderProps={{ color: "teal", type: "bars", size: "lg" }}
        />
        <form onSubmit={newCameraForm.onSubmit(handleSubmit)}>
          <Stack justify="space-around" w={rem(350)}>
            <Switch
              label="Enable Camera"
              type="checkbox"
              {...newCameraForm.getInputProps("enabled", {
                type: "checkbox",
              })}
            />
            <TextInput
              disabled={!newCameraForm.values.enabled}
              placeholder="Camera Name"
              {...newCameraForm.getInputProps("name")}
            />
            <Switch
              disabled={!newCameraForm.values.enabled}
              label="Timelapse"
              type="checkbox"
              {...newCameraForm.getInputProps("timelapseEnabled", {
                type: "checkbox",
              })}
            />
            <div>
              <Text size="sm" mb={5}>
                Timelapse Interval (minutes)
              </Text>
              <NumberInput
                disabled={
                  !newCameraForm.values.enabled ||
                  !newCameraForm.values.timelapseEnabled
                }
                min={1}
                max={1440}
                step={1}
                {...newCameraForm.getInputProps("timelapseInterval")}
              />
            </div>
            <Fragment>
              <Group justify="space-around">
                <TimeInput
                  disabled={
                    !newCameraForm.values.enabled ||
                    !newCameraForm.values.timelapseEnabled
                  }
                  label="Start time"
                  value={newCameraForm.values.timelapseStartTime ?? ""}
                  onChange={(value) => {
                    newCameraForm.setFieldValue(
                      "timelapseStartTime",
                      value.currentTarget.value ?? "",
                    );
                  }}
                />
                <TimeInput
                  disabled={
                    !newCameraForm.values.enabled ||
                    !newCameraForm.values.timelapseEnabled
                  }
                  label="End time"
                  value={newCameraForm.values.timelapseEndTime ?? ""}
                  onChange={(value) =>
                    newCameraForm.setFieldValue(
                      "timelapseEndTime",
                      value.currentTarget.value,
                    )
                  }
                />
              </Group>
            </Fragment>
            <Fieldset legend="Image Retention Limits">
              <NumberInput
                disabled={
                  !newCameraForm.values.enabled ||
                  !newCameraForm.values.timelapseEnabled
                }
                placeholder="Image Retention Days"
                step={1}
                min={1}
                suffix=" Days"
                {...newCameraForm.getInputProps("imageRetentionDays")}
              />
              <Group justify="space-around">- or -</Group>
              <NumberInput
                disabled={
                  !newCameraForm.values.enabled ||
                  !newCameraForm.values.timelapseEnabled
                }
                placeholder="Image Retention Size (MB)"
                step={1}
                min={1}
                suffix=" MB"
                {...newCameraForm.getInputProps("imageRetentionSize")}
              />
            </Fieldset>
            <Group justify="space-around">
              <Button
                size="md"
                style={{ width: rem(200) }}
                type="submit"
                loading={updateCameraSettingsMutation.isPending}
              >
                Update
              </Button>
            </Group>
          </Stack>
        </form>
      </Stack>
    </Fragment>
  );
}
