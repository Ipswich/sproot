import { Alert, Stack, Text } from "@mantine/core";

export default function CameraSettings() {
  return (
    <Stack gap="md">
      <Alert color="blue" title="Camera settings moved">
        Camera and timelapse configuration now lives in System Settings so all
        cameras can be managed together.
      </Alert>
      <Text size="sm" c="dimmed">
        Open System Settings to manage camera URLs, enablement, retention, and
        per-camera timelapse options.
      </Text>
    </Stack>
  );
}
