import { useEffect, useMemo, useState } from "react";
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
import ConfirmDeleteButton from "../../../components/ConfirmDeleteButton";
import {
  NewCameraSettings,
  clearAllImagesAsync,
  createCameraSettingsAsync,
  deleteCameraSettingsAsync,
  getCameraSettingsListAsync,
  updateCameraSettingsAsync,
} from "../../../requests/requests_v2";

type CameraDraft = NewCameraSettings & {
  id?: number;
  key: string;
};

function createDefaultDraft(index: number): CameraDraft {
  return {
    key: crypto.randomUUID(),
    enabled: false,
    name: `Camera ${index}`,
    captureUrl: "http://camera:3002/capture",
    streamUrl: "http://camera:3002/stream.mjpg",
    healthUrl: "http://camera:3002/health",
    timelapseEnabled: false,
    timelapseInterval: 5,
    timelapseStartTime: null,
    timelapseEndTime: null,
    imageRetentionDays: 90,
    imageRetentionSize: 5000,
  };
}

function toDraft(camera: SDBCameraSettings): CameraDraft {
  return {
    key: crypto.randomUUID(),
    ...camera,
  };
}

function toRequestBody(draft: CameraDraft): NewCameraSettings {
  return {
    enabled: draft.enabled,
    name: draft.name,
    captureUrl: draft.captureUrl,
    streamUrl: draft.streamUrl,
    healthUrl: draft.healthUrl,
    timelapseEnabled: draft.timelapseEnabled,
    timelapseInterval: draft.timelapseInterval,
    timelapseStartTime: draft.timelapseStartTime,
    timelapseEndTime: draft.timelapseEndTime,
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
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        errors.push(`${label} must use http or https.`);
      }
    } catch {
      errors.push(`${label} must be a valid URL.`);
    }
  });

  if (draft.imageRetentionDays < 0) {
    errors.push("Image retention days must be zero or greater.");
  }
  if (draft.imageRetentionSize < 0) {
    errors.push("Image retention size must be zero or greater.");
  }
  if (draft.timelapseEnabled) {
    if (draft.timelapseInterval == null || draft.timelapseInterval < 1 || draft.timelapseInterval > 1440) {
      errors.push("Timelapse interval must be between 1 and 1440 minutes when timelapse is enabled.");
    }
  }

  const timeRegex = /^\d{2}:\d{2}$/;
  if (draft.timelapseStartTime !== null && !timeRegex.test(draft.timelapseStartTime)) {
    errors.push("Timelapse start time must use HH:MM.");
  }
  if (draft.timelapseEndTime !== null && !timeRegex.test(draft.timelapseEndTime)) {
    errors.push("Timelapse end time must use HH:MM.");
  }
  if ((draft.timelapseStartTime === null) !== (draft.timelapseEndTime === null)) {
    errors.push("Timelapse start and end time must both be set or both be empty.");
  }

  return errors;
}

export default function CameraSettingsAccordionItem() {
  const [drafts, setDrafts] = useState<CameraDraft[]>([]);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeSaveKey, setActiveSaveKey] = useState<string | null>(null);
  const [activeDeleteKey, setActiveDeleteKey] = useState<string | null>(null);
  const [activeClearKey, setActiveClearKey] = useState<string | null>(null);

  const cameraSettingsQuery = useQuery({
    queryKey: ["cameraSettingsList"],
    queryFn: () => getCameraSettingsListAsync(),
    refetchInterval: 60000,
  });

  useEffect(() => {
    setDrafts((cameraSettingsQuery.data ?? []).map((camera) => toDraft(camera)));
  }, [cameraSettingsQuery.data]);

  const draftErrors = useMemo(() => {
    return Object.fromEntries(drafts.map((draft) => [draft.key, validateDraft(draft)]));
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
        error instanceof Error ? error.message : "Failed to update camera settings.",
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
      setSaveError(error instanceof Error ? error.message : "Failed to delete camera.");
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
      setSaveError(error instanceof Error ? error.message : "Failed to clear images.");
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
                  Configure camera, stream, health, and per-camera timelapse settings.
                </Text>
              </div>
              <Button
                leftSection={<IconPlus size={16} />}
                variant="light"
                onClick={() => {
                  setDrafts((currentDrafts) => {
                    return [...currentDrafts, createDefaultDraft(currentDrafts.length + 1)];
                  });
                }}
              >
                Add Camera
              </Button>
            </Group>

            {saveMessage && <Alert color="green">{saveMessage}</Alert>}
            {saveError && <Alert color="red">{saveError}</Alert>}

            {drafts.map((draft, index) => {
              const errors = draftErrors[draft.key] ?? [];
              const isPending = activeSaveKey === draft.key;
              const isDeleting = activeDeleteKey === draft.key;
              const isClearing = activeClearKey === draft.key;

              return (
                <Paper key={draft.key} withBorder radius="md" p="lg" shadow="xs">
                  <Stack gap="md">
                    <Group justify="space-between" align="flex-start">
                      <div>
                        <Text fw={600}>{draft.name || `Camera ${index + 1}`}</Text>
                        <Text size="sm" c="dimmed">
                          {draft.id ? `Camera ID ${draft.id}` : "New camera"}
                        </Text>
                      </div>
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
                          onConfirm={async () => {
                            if (!draft.id) {
                              setDrafts((currentDrafts) => {
                                return currentDrafts.filter((currentDraft) => currentDraft.key !== draft.key);
                              });
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
                          updateDraft(draft.key, "name", event.currentTarget.value);
                        }}
                      />
                      <Switch
                        label="Enabled"
                        checked={draft.enabled}
                        onChange={(event) => {
                          updateDraft(draft.key, "enabled", event.currentTarget.checked);
                        }}
                      />
                      <TextInput
                        label="Capture URL"
                        value={draft.captureUrl}
                        onChange={(event) => {
                          updateDraft(draft.key, "captureUrl", event.currentTarget.value);
                        }}
                      />
                      <TextInput
                        label="Stream URL"
                        value={draft.streamUrl}
                        onChange={(event) => {
                          updateDraft(draft.key, "streamUrl", event.currentTarget.value);
                        }}
                      />
                      <TextInput
                        label="Health URL"
                        value={draft.healthUrl}
                        onChange={(event) => {
                          updateDraft(draft.key, "healthUrl", event.currentTarget.value);
                        }}
                      />
                      <Switch
                        label="Timelapse Enabled"
                        checked={draft.timelapseEnabled}
                        onChange={(event) => {
                          updateDraft(draft.key, "timelapseEnabled", event.currentTarget.checked);
                        }}
                      />
                      <NumberInput
                        label="Timelapse Interval (minutes)"
                        value={draft.timelapseInterval}
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
                      <Group grow align="flex-end">
                        <TimeInput
                          label="Timelapse Start"
                          value={draft.timelapseStartTime ?? ""}
                          onChange={(event) => {
                            const value = event.currentTarget.value.trim();
                            updateDraft(draft.key, "timelapseStartTime", value === "" ? null : value);
                          }}
                          disabled={!draft.timelapseEnabled}
                        />
                        <TimeInput
                          label="Timelapse End"
                          value={draft.timelapseEndTime ?? ""}
                          onChange={(event) => {
                            const value = event.currentTarget.value.trim();
                            updateDraft(draft.key, "timelapseEndTime", value === "" ? null : value);
                          }}
                          disabled={!draft.timelapseEnabled}
                        />
                      </Group>
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

                    <Group justify="space-between">
                      <Text size="sm" c="dimmed">
                        Timelapse captures are stored and archived independently per camera id.
                      </Text>
                      <Button
                        variant="subtle"
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
              );
            })}
          </Stack>
        </Box>
      </Accordion.Panel>
    </Accordion.Item>
  );
}
