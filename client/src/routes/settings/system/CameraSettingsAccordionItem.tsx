import { useEffect, useMemo, useRef, useState } from "react";
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
  Switch,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { TimeInput } from "@mantine/dates";
import { IconDeviceFloppy, IconPlus, IconVideo } from "@tabler/icons-react";
import { SDBCameraSettings } from "@sproot/database/SDBCameraSettings";
import type { DynamicTimePoint } from "@sproot/common/automation/TimeConditionTimePoints";
import {
  DYNAMIC_TIME_POINT_LABELS,
  DYNAMIC_TIME_POINT_VALUES,
  isDynamicTimePoint,
} from "@sproot/common/automation/TimeConditionTimePoints";
import { formatMilitaryTime } from "@sproot/common/utility/TimeMethods";
import ConfirmDeleteButton from "../../../components/ConfirmDeleteButton";
import {
  getApplicationSettingsAsync,
  getCameraStreamTestUrl,
  NewCameraSettings,
  CameraHealthTestResult,
  clearAllImagesAsync,
  createCameraSettingsAsync,
  deleteCameraSettingsAsync,
  getCameraSettingsListAsync,
  testCameraHealthAsync,
  testCameraLatestImageAsync,
  updateCameraSettingsAsync,
} from "../../../requests/requests_v2";
import { useSolarLunarTimes } from "../../automations/Conditions/ConditionTypes/useSolarLunarTimes";
import type { SolarLunarTimesMap } from "../../automations/Conditions/ConditionTypes/useSolarLunarTimes";

type TimeExpressionMode = "clock" | "dynamic";

type CameraDraft = NewCameraSettings & {
  id?: number;
  key: string;
};

type CameraPreviewMode = "image" | "stream";

type CameraTestState = {
  activeTest: "capture" | "stream" | "health" | null;
  error: string | null;
  healthResult: CameraHealthTestResult | null;
  previewMode: CameraPreviewMode | null;
  previewSrc: string | null;
};

function createDefaultCameraTestState(): CameraTestState {
  return {
    activeTest: null,
    error: null,
    healthResult: null,
    previewMode: null,
    previewSrc: null,
  };
}

function createDraftKey() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `camera-draft-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createPersistedDraftKey(id: number) {
  return `camera-draft-${id}`;
}

function normalizeUrl(value: string): string {
  return value.trim();
}

function hasConfiguredUrl(value: string): boolean {
  return normalizeUrl(value) !== "";
}

function resolveExpressionMode(value: string | null): TimeExpressionMode {
  return value != null && isDynamicTimePoint(value) ? "dynamic" : "clock";
}

function secondsToMinuteInput(value: number | null): number | "" {
  return value == null ? "" : value / 60;
}

function minutesToOffsetSeconds(value: string | number): number | null {
  return typeof value === "number" && value !== 0 ? value * 60 : null;
}

function formatDynamicTime(date: Date): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return formatMilitaryTime(`${hh}:${mm}`) ?? "";
}

function describeCameraSources(draft: CameraDraft): string {
  const sources = [] as string[];
  if (hasConfiguredUrl(draft.captureUrl)) {
    sources.push("Latest capture");
  }
  if (hasConfiguredUrl(draft.streamUrl)) {
    sources.push("Live stream");
  }
  if (hasConfiguredUrl(draft.healthUrl)) {
    sources.push("Health check");
  }

  return sources.length > 0
    ? sources.join(" • ")
    : "No camera source configured";
}

function createDefaultDraft(index: number): CameraDraft {
  return {
    key: createDraftKey(),
    enabled: false,
    name: `Camera ${index}`,
    captureUrl: "http://camera:3002/capture",
    streamUrl: "http://camera:3002/stream.mjpg",
    healthUrl: "",
    timelapseEnabled: false,
    timelapseInterval: 5,
    timelapseStartTime: null,
    timelapseStartOffsetSeconds: null,
    timelapseEndTime: null,
    timelapseEndOffsetSeconds: null,
    imageRetentionDays: 90,
    imageRetentionSize: 5000,
  };
}

function toDraft(camera: SDBCameraSettings): CameraDraft {
  return {
    key: createPersistedDraftKey(camera.id),
    ...camera,
  };
}

function toRequestBody(draft: CameraDraft): NewCameraSettings {
  return {
    enabled: draft.enabled,
    name: draft.name,
    captureUrl: normalizeUrl(draft.captureUrl),
    streamUrl: normalizeUrl(draft.streamUrl),
    healthUrl: normalizeUrl(draft.healthUrl),
    timelapseEnabled: draft.timelapseEnabled,
    timelapseInterval: draft.timelapseInterval,
    timelapseStartTime: draft.timelapseStartTime,
    timelapseStartOffsetSeconds: draft.timelapseStartOffsetSeconds ?? null,
    timelapseEndTime: draft.timelapseEndTime,
    timelapseEndOffsetSeconds: draft.timelapseEndOffsetSeconds ?? null,
    imageRetentionDays: draft.imageRetentionDays,
    imageRetentionSize: draft.imageRetentionSize,
  };
}

function validateDraft(draft: CameraDraft): string[] {
  const errors: string[] = [];
  const urlFields: Array<[string, string]> = [
    ["captureUrl", draft.captureUrl],
    ["streamUrl", draft.streamUrl],
    ["healthUrl", draft.healthUrl],
  ];

  if (draft.name.trim().length < 1 || draft.name.trim().length > 64) {
    errors.push("Name must be between 1 and 64 characters.");
  }

  urlFields.forEach(([label, value]) => {
    const trimmedValue = normalizeUrl(value);
    if (trimmedValue === "") {
      return;
    }

    try {
      const parsed = new URL(trimmedValue);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        errors.push(`${label} must use http or https.`);
      }
    } catch {
      errors.push(`${label} must be a valid URL.`);
    }
  });

  if (
    !hasConfiguredUrl(draft.captureUrl) &&
    !hasConfiguredUrl(draft.streamUrl)
  ) {
    errors.push("Provide at least a capture URL or a stream URL.");
  }

  if (draft.imageRetentionDays < 0) {
    errors.push("Image retention days must be zero or greater.");
  }
  if (draft.imageRetentionSize < 0) {
    errors.push("Image retention size must be zero or greater.");
  }
  if (draft.timelapseEnabled) {
    if (!hasConfiguredUrl(draft.captureUrl)) {
      errors.push("Capture URL is required when timelapse is enabled.");
    }
    if (
      draft.timelapseInterval == null ||
      draft.timelapseInterval < 1 ||
      draft.timelapseInterval > 1440
    ) {
      errors.push(
        "Timelapse interval must be between 1 and 1440 minutes when timelapse is enabled.",
      );
    }
  }

  const timeRegex = /^\d{2}:\d{2}$/;
  if (
    draft.timelapseStartTime !== null &&
    !timeRegex.test(draft.timelapseStartTime) &&
    !isDynamicTimePoint(draft.timelapseStartTime)
  ) {
    errors.push(
      "Timelapse start time must use HH:MM or a supported solar/lunar point.",
    );
  }
  if (
    draft.timelapseEndTime !== null &&
    !timeRegex.test(draft.timelapseEndTime) &&
    !isDynamicTimePoint(draft.timelapseEndTime)
  ) {
    errors.push(
      "Timelapse end time must use HH:MM or a supported solar/lunar point.",
    );
  }
  if (
    (draft.timelapseStartTime === null) !==
    (draft.timelapseEndTime === null)
  ) {
    errors.push(
      "Timelapse start and end time must both be set or both be empty.",
    );
  }
  if (
    draft.timelapseStartOffsetSeconds !== null &&
    !isDynamicTimePoint(draft.timelapseStartTime ?? "")
  ) {
    errors.push(
      "Timelapse start offset is only supported for solar/lunar time points.",
    );
  }
  if (
    draft.timelapseEndOffsetSeconds !== null &&
    !isDynamicTimePoint(draft.timelapseEndTime ?? "")
  ) {
    errors.push(
      "Timelapse end offset is only supported for solar/lunar time points.",
    );
  }

  return errors;
}

export default function CameraSettingsAccordionItem() {
  const [drafts, setDrafts] = useState<CameraDraft[]>([]);
  const [expandedDraftKeys, setExpandedDraftKeys] = useState<string[]>([]);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeSaveKey, setActiveSaveKey] = useState<string | null>(null);
  const [activeDeleteKey, setActiveDeleteKey] = useState<string | null>(null);
  const [activeClearKey, setActiveClearKey] = useState<string | null>(null);
  const [cameraTestStateByKey, setCameraTestStateByKey] = useState<
    Record<string, CameraTestState>
  >({});
  const previewObjectUrlsRef = useRef<Record<string, string>>({});

  const cameraSettingsQuery = useQuery({
    queryKey: ["cameraSettingsList"],
    queryFn: () => getCameraSettingsListAsync(),
    refetchInterval: 60000,
  });

  const applicationSettingsQuery = useQuery({
    queryKey: ["applicationSettings"],
    queryFn: () => getApplicationSettingsAsync(),
  });

  const hasDynamicTimeSupport =
    typeof applicationSettingsQuery.data?.["system.latitude"] === "string" &&
    typeof applicationSettingsQuery.data?.["system.longitude"] === "string";

  const solarLunarTimes = useSolarLunarTimes(
    applicationSettingsQuery.data?.["system.latitude"] ?? null,
    applicationSettingsQuery.data?.["system.longitude"] ?? null,
  );

  useEffect(() => {
    const nextDrafts = (cameraSettingsQuery.data ?? []).map((camera) =>
      toDraft(camera),
    );
    setDrafts(nextDrafts);
    setExpandedDraftKeys((currentKeys) => {
      const nextKeys = currentKeys.filter((key) =>
        nextDrafts.some((draft) => draft.key === key),
      );
      return nextKeys;
    });
  }, [cameraSettingsQuery.data]);

  useEffect(() => {
    return () => {
      Object.values(previewObjectUrlsRef.current).forEach((previewUrl) => {
        URL.revokeObjectURL(previewUrl);
      });
    };
  }, []);

  const draftErrors = useMemo(() => {
    return Object.fromEntries(
      drafts.map((draft) => [draft.key, validateDraft(draft)]),
    );
  }, [drafts]);

  const refreshDrafts = async () => {
    await cameraSettingsQuery.refetch();
  };

  const saveMutation = useMutation({
    mutationFn: async (draft: CameraDraft) => {
      if (draft.id) {
        await updateCameraSettingsAsync(draft.id, toRequestBody(draft));
        return draft.id;
      }

      const created = await createCameraSettingsAsync(toRequestBody(draft));
      return created.id;
    },
    onMutate: (draft) => {
      setActiveSaveKey(draft.key);
      setSaveMessage(null);
      setSaveError(null);
    },
    onSuccess: async () => {
      await refreshDrafts();
      setSaveMessage("Camera settings updated.");
    },
    onError: (error) => {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Failed to update camera settings.",
      );
      setSaveMessage(null);
    },
    onSettled: () => {
      setActiveSaveKey(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (draft: CameraDraft) => {
      if (!draft.id) {
        return;
      }
      await deleteCameraSettingsAsync(draft.id);
    },
    onMutate: (draft) => {
      setActiveDeleteKey(draft.key);
      setSaveMessage(null);
      setSaveError(null);
    },
    onSuccess: async () => {
      await refreshDrafts();
      setSaveMessage("Camera removed.");
    },
    onError: (error) => {
      setSaveError(
        error instanceof Error ? error.message : "Failed to delete camera.",
      );
      setSaveMessage(null);
    },
    onSettled: () => {
      setActiveDeleteKey(null);
    },
  });

  const clearImagesMutation = useMutation({
    mutationFn: async (draft: CameraDraft) => {
      if (!draft.id) {
        return;
      }
      await clearAllImagesAsync(draft.id);
    },
    onMutate: (draft) => {
      setActiveClearKey(draft.key);
      setSaveMessage(null);
      setSaveError(null);
    },
    onSuccess: () => {
      setSaveMessage("Timelapse images cleared.");
    },
    onError: (error) => {
      setSaveError(
        error instanceof Error ? error.message : "Failed to clear images.",
      );
      setSaveMessage(null);
    },
    onSettled: () => {
      setActiveClearKey(null);
    },
  });

  const updateDraft = <K extends keyof CameraDraft>(
    key: string,
    field: K,
    value: CameraDraft[K],
  ) => {
    setDrafts((currentDrafts) => {
      return currentDrafts.map((draft) => {
        if (draft.key !== key) {
          return draft;
        }
        return {
          ...draft,
          [field]: value,
        };
      });
    });
  };

  const updateCameraTestState = (
    key: string,
    updater: (state: CameraTestState) => CameraTestState,
  ) => {
    setCameraTestStateByKey((currentState) => {
      const nextState = updater(
        currentState[key] ?? createDefaultCameraTestState(),
      );
      return {
        ...currentState,
        [key]: nextState,
      };
    });
  };

  const replacePreviewForDraft = (
    draftKey: string,
    previewMode: CameraPreviewMode,
    previewSrc: string,
  ) => {
    const existingObjectUrl = previewObjectUrlsRef.current[draftKey];
    if (existingObjectUrl && existingObjectUrl !== previewSrc) {
      URL.revokeObjectURL(existingObjectUrl);
      delete previewObjectUrlsRef.current[draftKey];
    }

    if (previewSrc.startsWith("blob:")) {
      previewObjectUrlsRef.current[draftKey] = previewSrc;
    }

    updateCameraTestState(draftKey, (currentState) => ({
      ...currentState,
      activeTest: null,
      error: null,
      previewMode,
      previewSrc,
    }));
  };

  const handleLatestImageTestAsync = async (draft: CameraDraft) => {
    updateCameraTestState(draft.key, (currentState) => ({
      ...currentState,
      activeTest: "capture",
      error: null,
    }));

    try {
      const previewSrc = await testCameraLatestImageAsync(draft.captureUrl);
      replacePreviewForDraft(draft.key, "image", previewSrc);
    } catch (error) {
      updateCameraTestState(draft.key, (currentState) => ({
        ...currentState,
        activeTest: null,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch a test camera image.",
      }));
    }
  };

  const handleStreamTest = (draft: CameraDraft) => {
    replacePreviewForDraft(
      draft.key,
      "stream",
      getCameraStreamTestUrl(draft.streamUrl),
    );
  };

  const handleHealthTestAsync = async (draft: CameraDraft) => {
    updateCameraTestState(draft.key, (currentState) => ({
      ...currentState,
      activeTest: "health",
      error: null,
    }));

    try {
      const healthResult = await testCameraHealthAsync(draft.healthUrl);
      updateCameraTestState(draft.key, (currentState) => ({
        ...currentState,
        activeTest: null,
        error: null,
        healthResult,
      }));
    } catch (error) {
      updateCameraTestState(draft.key, (currentState) => ({
        ...currentState,
        activeTest: null,
        error:
          error instanceof Error
            ? error.message
            : "Failed to check camera health.",
      }));
    }
  };

  const clearPreviewForDraft = (draftKey: string) => {
    const existingObjectUrl = previewObjectUrlsRef.current[draftKey];
    if (existingObjectUrl) {
      URL.revokeObjectURL(existingObjectUrl);
      delete previewObjectUrlsRef.current[draftKey];
    }

    updateCameraTestState(draftKey, (currentState) => ({
      ...currentState,
      previewMode: null,
      previewSrc: null,
    }));
  };

  return (
    <Accordion.Item value="camera-settings">
      <Accordion.Control>
        <Group pl={"xl"}>
          <IconVideo />
          <Title order={3} fw={450}>
            Camera Settings
          </Title>
        </Group>
      </Accordion.Control>
      <Accordion.Panel>
        <Box pos="relative">
          <LoadingOverlay
            visible={cameraSettingsQuery.isLoading}
            zIndex={1000}
            loaderProps={{ color: "teal", type: "bars", size: "lg" }}
          />
          <Stack gap="lg">
            <Group justify="space-between">
              <div>
                <Text fw={600}>External Cameras</Text>
                <Text size="sm" c="dimmed">
                  Configure camera, stream, health, and per-camera timelapse
                  settings.
                </Text>
              </div>
              <Button
                leftSection={<IconPlus size={16} />}
                variant="light"
                onClick={() => {
                  const newDraft = createDefaultDraft(drafts.length + 1);
                  setDrafts((currentDrafts) => {
                    return [...currentDrafts, newDraft];
                  });
                  setExpandedDraftKeys((currentKeys) => [
                    ...currentKeys,
                    newDraft.key,
                  ]);
                }}
              >
                Add Camera
              </Button>
            </Group>

            {saveMessage && <Alert color="green">{saveMessage}</Alert>}
            {saveError && <Alert color="red">{saveError}</Alert>}

            {!hasDynamicTimeSupport && (
              <Alert color="yellow" title="Dynamic time points are unavailable">
                Set latitude and longitude in Application Settings to unlock
                solar and lunar timelapse windows.
              </Alert>
            )}

            <Accordion
              multiple
              variant="separated"
              value={expandedDraftKeys}
              onChange={setExpandedDraftKeys}
            >
              {drafts.map((draft, index) => {
                const errors = draftErrors[draft.key] ?? [];
                const isPending = activeSaveKey === draft.key;
                const isDeleting = activeDeleteKey === draft.key;
                const isClearing = activeClearKey === draft.key;
                const cameraTestState =
                  cameraTestStateByKey[draft.key] ??
                  createDefaultCameraTestState();
                const isTestingCapture =
                  cameraTestState.activeTest === "capture";
                const isTestingHealth = cameraTestState.activeTest === "health";
                const isStreamPreviewVisible =
                  cameraTestState.previewMode === "stream" &&
                  cameraTestState.previewSrc !== null;

                return (
                  <Accordion.Item key={draft.key} value={draft.key}>
                    <Accordion.Control>
                      <Stack gap={2}>
                        <Text fw={600}>
                          {draft.name || `Camera ${index + 1}`}
                        </Text>
                        <Text size="sm" c="dimmed">
                          {describeCameraSources(draft)}
                        </Text>
                        <Text
                          size="xs"
                          c={errors.length > 0 ? "yellow.7" : "dimmed"}
                        >
                          {draft.id ? null : "New camera"}
                          {errors.length > 0
                            ? ` • ${errors.length} issue${errors.length > 1 ? "s" : ""}`
                            : ""}
                        </Text>
                      </Stack>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Paper withBorder radius="md" p="lg" shadow="xs">
                        <Stack gap="md">
                          <Group justify="space-between" align="flex-start">
                            <Group>
                              <Button
                                leftSection={<IconDeviceFloppy size={16} />}
                                variant="light"
                                loading={isPending}
                                disabled={errors.length > 0}
                                onClick={() => {
                                  saveMutation.mutate(draft);
                                }}
                              >
                                Save
                              </Button>
                              <ConfirmDeleteButton
                                buttonProps={{ variant: "light" }}
                                onConfirm={async () => {
                                  if (!draft.id) {
                                    setDrafts((currentDrafts) => {
                                      return currentDrafts.filter(
                                        (currentDraft) =>
                                          currentDraft.key !== draft.key,
                                      );
                                    });
                                    setExpandedDraftKeys((currentKeys) =>
                                      currentKeys.filter(
                                        (key) => key !== draft.key,
                                      ),
                                    );
                                    return;
                                  }

                                  await deleteMutation.mutateAsync(draft);
                                }}
                                loading={isDeleting}
                              >
                                Delete
                              </ConfirmDeleteButton>
                            </Group>
                          </Group>

                          {errors.length > 0 && (
                            <Alert color="yellow" title="Fix before saving">
                              {errors.join(" ")}
                            </Alert>
                          )}

                          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                            <TextInput
                              label="Name"
                              value={draft.name}
                              onChange={(event) => {
                                updateDraft(
                                  draft.key,
                                  "name",
                                  event.currentTarget.value,
                                );
                              }}
                            />
                            <Switch
                              label="Enabled"
                              withThumbIndicator={false}
                              checked={draft.enabled}
                              onChange={(event) => {
                                updateDraft(
                                  draft.key,
                                  "enabled",
                                  event.currentTarget.checked,
                                );
                              }}
                            />
                            <TextInput
                              label="Capture URL"
                              placeholder="Optional if stream URL is provided"
                              value={draft.captureUrl}
                              onChange={(event) => {
                                updateDraft(
                                  draft.key,
                                  "captureUrl",
                                  event.currentTarget.value,
                                );
                              }}
                            />
                            <TextInput
                              label="Stream URL"
                              placeholder="Optional if capture URL is provided"
                              value={draft.streamUrl}
                              onChange={(event) => {
                                updateDraft(
                                  draft.key,
                                  "streamUrl",
                                  event.currentTarget.value,
                                );
                              }}
                            />
                            <TextInput
                              label="Health URL"
                              placeholder="Optional"
                              value={draft.healthUrl}
                              onChange={(event) => {
                                updateDraft(
                                  draft.key,
                                  "healthUrl",
                                  event.currentTarget.value,
                                );
                              }}
                            />
                            <Switch
                              label="Timelapse Enabled"
                              withThumbIndicator={false}
                              checked={draft.timelapseEnabled}
                              onChange={(event) => {
                                updateDraft(
                                  draft.key,
                                  "timelapseEnabled",
                                  event.currentTarget.checked,
                                );
                              }}
                            />
                            <NumberInput
                              label="Timelapse Interval (minutes)"
                              value={draft.timelapseInterval ?? ""}
                              min={1}
                              max={1440}
                              onChange={(value) => {
                                updateDraft(
                                  draft.key,
                                  "timelapseInterval",
                                  typeof value === "number" ? value : null,
                                );
                              }}
                              disabled={!draft.timelapseEnabled}
                            />
                            <NumberInput
                              label="Image Retention Days"
                              value={draft.imageRetentionDays}
                              min={0}
                              onChange={(value) => {
                                updateDraft(
                                  draft.key,
                                  "imageRetentionDays",
                                  typeof value === "number" ? value : 0,
                                );
                              }}
                              disabled={!draft.timelapseEnabled}
                            />
                            <NumberInput
                              label="Image Retention Size (MB)"
                              value={draft.imageRetentionSize}
                              min={0}
                              onChange={(value) => {
                                updateDraft(
                                  draft.key,
                                  "imageRetentionSize",
                                  typeof value === "number" ? value : 0,
                                );
                              }}
                              disabled={!draft.timelapseEnabled}
                            />
                          </SimpleGrid>

                          <Stack gap="xs">
                            <Text size="sm" fw={500}>
                              Connection Tests
                            </Text>
                            <Group>
                              <Button
                                size="xs"
                                variant="light"
                                disabled={!hasConfiguredUrl(draft.captureUrl)}
                                loading={isTestingCapture}
                                onClick={() => {
                                  void handleLatestImageTestAsync(draft);
                                }}
                              >
                                Test Latest Image
                              </Button>
                              <Button
                                size="xs"
                                variant="light"
                                disabled={!hasConfiguredUrl(draft.streamUrl)}
                                onClick={() => {
                                  handleStreamTest(draft);
                                }}
                              >
                                Preview Stream
                              </Button>
                              <Button
                                size="xs"
                                variant="light"
                                disabled={!hasConfiguredUrl(draft.healthUrl)}
                                loading={isTestingHealth}
                                onClick={() => {
                                  void handleHealthTestAsync(draft);
                                }}
                              >
                                Check Health
                              </Button>
                              {cameraTestState.previewSrc ? (
                                <Button
                                  size="xs"
                                  variant="subtle"
                                  onClick={() => {
                                    clearPreviewForDraft(draft.key);
                                  }}
                                >
                                  Close Preview
                                </Button>
                              ) : null}
                            </Group>
                            <Text size="xs" c="dimmed">
                              These tests run through the server so you can
                              verify external camera URLs from the same network
                              path used in production.
                            </Text>
                            {cameraTestState.error ? (
                              <Alert color="red" title="Camera test failed">
                                {cameraTestState.error}
                              </Alert>
                            ) : null}
                            {cameraTestState.healthResult ? (
                              <Alert
                                color="green"
                                title="Health endpoint responded"
                              >
                                {`${cameraTestState.healthResult.statusCode} ${cameraTestState.healthResult.statusText}`}
                                {cameraTestState.healthResult.contentType
                                  ? ` • ${cameraTestState.healthResult.contentType}`
                                  : ""}
                                {cameraTestState.healthResult.bodyPreview
                                  ? ` • ${cameraTestState.healthResult.bodyPreview}`
                                  : ""}
                              </Alert>
                            ) : null}
                            {cameraTestState.previewSrc ? (
                              <Stack gap="xs">
                                <Text size="sm" fw={500}>
                                  {isStreamPreviewVisible
                                    ? "Stream Preview"
                                    : "Latest Image Preview"}
                                </Text>
                                <Box
                                  style={{
                                    overflow: "hidden",
                                    borderRadius: "var(--mantine-radius-sm)",
                                    background: "#111",
                                  }}
                                >
                                  <img
                                    alt={`${draft.name} test preview`}
                                    onError={() => {
                                      updateCameraTestState(
                                        draft.key,
                                        (currentState) => ({
                                          ...currentState,
                                          error: isStreamPreviewVisible
                                            ? "The stream preview could not be loaded through the server."
                                            : "The latest image preview could not be loaded through the server.",
                                        }),
                                      );
                                    }}
                                    src={cameraTestState.previewSrc}
                                    style={{
                                      display: "block",
                                      width: "100%",
                                      maxHeight: 320,
                                      objectFit: "cover",
                                    }}
                                  />
                                </Box>
                              </Stack>
                            ) : null}
                          </Stack>

                          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                            <CameraTimeExpressionField
                              label="Timelapse Start"
                              value={draft.timelapseStartTime}
                              offsetSeconds={
                                draft.timelapseStartOffsetSeconds ?? null
                              }
                              disabled={!draft.timelapseEnabled}
                              dynamicEnabled={hasDynamicTimeSupport}
                              timeSuffixes={solarLunarTimes}
                              onChange={(value) => {
                                updateDraft(
                                  draft.key,
                                  "timelapseStartTime",
                                  value,
                                );
                              }}
                              onOffsetChange={(value) => {
                                updateDraft(
                                  draft.key,
                                  "timelapseStartOffsetSeconds",
                                  value,
                                );
                              }}
                            />
                            <CameraTimeExpressionField
                              label="Timelapse End"
                              value={draft.timelapseEndTime}
                              offsetSeconds={
                                draft.timelapseEndOffsetSeconds ?? null
                              }
                              disabled={!draft.timelapseEnabled}
                              dynamicEnabled={hasDynamicTimeSupport}
                              timeSuffixes={solarLunarTimes}
                              onChange={(value) => {
                                updateDraft(
                                  draft.key,
                                  "timelapseEndTime",
                                  value,
                                );
                              }}
                              onOffsetChange={(value) => {
                                updateDraft(
                                  draft.key,
                                  "timelapseEndOffsetSeconds",
                                  value,
                                );
                              }}
                            />
                          </SimpleGrid>

                          <Group justify="space-between">
                            <Text size="sm" c="dimmed">
                              Timelapse captures are organized independently per
                              camera id.
                            </Text>
                            <Button
                              variant="light"
                              color="red"
                              disabled={!draft.id || !draft.timelapseEnabled}
                              loading={isClearing}
                              onClick={() => {
                                clearImagesMutation.mutate(draft);
                              }}
                            >
                              Clear Timelapse Images
                            </Button>
                          </Group>
                        </Stack>
                      </Paper>
                    </Accordion.Panel>
                  </Accordion.Item>
                );
              })}
            </Accordion>
          </Stack>
        </Box>
      </Accordion.Panel>
    </Accordion.Item>
  );
}

type CameraTimeExpressionFieldProps = {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  offsetSeconds: number | null;
  onOffsetChange: (value: number | null) => void;
  disabled: boolean;
  dynamicEnabled: boolean;
  timeSuffixes: SolarLunarTimesMap | null;
};

function CameraTimeExpressionField({
  label,
  value,
  onChange,
  offsetSeconds,
  onOffsetChange,
  disabled,
  dynamicEnabled,
  timeSuffixes,
}: CameraTimeExpressionFieldProps) {
  const [mode, setMode] = useState<TimeExpressionMode>(
    resolveExpressionMode(value),
  );

  useEffect(() => {
    if (value !== null) {
      setMode(resolveExpressionMode(value));
    }
  }, [value]);

  const timeValues = useMemo(() => {
    if (!timeSuffixes) {
      return {} as Record<DynamicTimePoint, string | null>;
    }

    const result = {} as Record<DynamicTimePoint, string | null>;
    for (const point of DYNAMIC_TIME_POINT_VALUES) {
      const time = timeSuffixes[point];
      result[point] = time ? formatDynamicTime(time) : null;
    }
    return result;
  }, [timeSuffixes]);

  const timePointOptions = useMemo(() => {
    return DYNAMIC_TIME_POINT_VALUES.map((dynamicValue) => ({
      value: dynamicValue,
      label: DYNAMIC_TIME_POINT_LABELS[dynamicValue],
    }));
  }, []);

  return (
    <Stack gap="xs">
      <Text size="sm" fw={500}>
        {label}
      </Text>
      <SegmentedControl
        fullWidth
        value={mode}
        disabled={disabled}
        onChange={(nextMode) => {
          if (
            nextMode === "clock" ||
            (nextMode === "dynamic" && dynamicEnabled)
          ) {
            setMode(nextMode as TimeExpressionMode);
            onChange(null);
            onOffsetChange(null);
          }
        }}
        data={[
          { label: "Clock", value: "clock" },
          { label: "Solar/Lunar", value: "dynamic", disabled: !dynamicEnabled },
        ]}
      />
      {mode === "clock" ? (
        <TimeInput
          value={mode === resolveExpressionMode(value) ? (value ?? "") : ""}
          onChange={(event) => {
            const nextValue = event.currentTarget.value.trim();
            onChange(nextValue === "" ? null : nextValue);
          }}
          disabled={disabled}
        />
      ) : (
        <>
          <Select
            searchable
            allowDeselect={false}
            placeholder="Select a solar or lunar event"
            data={timePointOptions}
            value={mode === resolveExpressionMode(value) ? value : null}
            onChange={(nextValue) => onChange(nextValue ?? null)}
            disabled={disabled}
            renderOption={({ option }) => {
              const time = timeValues[option.value as DynamicTimePoint] ?? null;
              return (
                <span>
                  {option.label}
                  {time ? (
                    <Text span c="dimmed" size="sm">
                      {` (${time})`}
                    </Text>
                  ) : null}
                </span>
              );
            }}
          />
          <NumberInput
            allowDecimal={false}
            description="Negative is before the event. Positive is after."
            disabled={disabled}
            label={`${label} Offset`}
            step={1}
            suffix=" min"
            value={secondsToMinuteInput(offsetSeconds)}
            onChange={(nextValue) => {
              onOffsetChange(minutesToOffsetSeconds(nextValue));
            }}
          />
        </>
      )}
    </Stack>
  );
}
