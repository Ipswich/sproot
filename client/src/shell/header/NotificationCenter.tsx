import {
  ActionIcon,
  Badge,
  Box,
  Divider,
  Group,
  Modal,
  Popover,
  ScrollArea,
  Stack,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { IconBell, IconBellRinging, IconX } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { getActiveNotificationsAsync } from "../../requests/requests_v2";
import { IActiveNotification } from "@sproot/automation/IActiveNotification";

const NOTIFICATION_STATE_STORAGE_KEY = "sproot.activeNotificationStates";
const NOTIFICATION_STATE_TTL_MS = 24 * 60 * 60 * 1000;

type NotificationDisplayState = "active" | "read" | "dismissed";

type StoredNotificationState = {
  state: Exclude<NotificationDisplayState, "active">;
  expiresAt: number;
};

type StoredNotificationStateMap = Record<string, StoredNotificationState>;

export default function NotificationCenter() {
  const [selectedNotification, setSelectedNotification] =
    useState<IActiveNotification | null>(null);
  const [notificationStates, setNotificationStates] =
    useState<StoredNotificationStateMap>(() => loadNotificationStates());
  const [popoverOpened, setPopoverOpened] = useState(false);

  const activeNotificationsQuery = useQuery({
    queryKey: ["activeNotifications"],
    queryFn: () => getActiveNotificationsAsync(),
    refetchInterval: 30000,
    retry: 1,
  });

  const activeNotifications = activeNotificationsQuery.data;

  useEffect(() => {
    const nextNotificationStates = syncNotificationStates(
      notificationStates,
      activeNotificationsQuery.isSuccess
        ? (activeNotifications?.notifications ?? [])
        : undefined,
    );

    if (nextNotificationStates !== notificationStates) {
      setNotificationStates(nextNotificationStates);
    }
  }, [
    activeNotifications?.notifications,
    activeNotificationsQuery.isSuccess,
    notificationStates,
  ]);

  const { activeItems, readItems } = useMemo(() => {
    const notificationItems = activeNotifications?.notifications ?? [];

    return notificationItems.reduce(
      (result, notification) => {
        const notificationState = getNotificationDisplayState(
          notification,
          notificationStates,
        );

        if (notificationState === "active") {
          result.activeItems.push(notification);
        }
        if (notificationState === "read") {
          result.readItems.push(notification);
        }

        return result;
      },
      {
        activeItems: [] as IActiveNotification[],
        readItems: [] as IActiveNotification[],
      },
    );
  }, [activeNotifications, notificationStates]);

  function updateNotificationState(
    notification: IActiveNotification,
    state: Exclude<NotificationDisplayState, "active">,
  ) {
    const notificationKey = getNotificationStateKey(notification);
    const nextNotificationStates = syncNotificationStates({
      ...notificationStates,
      [notificationKey]: {
        state,
        expiresAt: Date.now() + NOTIFICATION_STATE_TTL_MS,
      },
    });

    setNotificationStates(nextNotificationStates);
    persistNotificationStates(nextNotificationStates);
  }

  return (
    <>
      <Popover
        position="bottom-end"
        withArrow
        shadow="md"
        width={360}
        zIndex={50}
        closeOnClickOutside={selectedNotification == null}
        closeOnEscape={selectedNotification == null}
        opened={popoverOpened}
        onChange={(opened) => {
          if (selectedNotification != null && !opened) {
            return;
          }

          setPopoverOpened(opened);
        }}
      >
        <Popover.Target>
          <Box pos="relative">
            <ActionIcon
              variant="subtle"
              color={activeItems.length > 0 ? "red" : "gray"}
              size="lg"
              radius="xl"
              aria-label="View notifications"
              aria-haspopup="dialog"
              aria-expanded={popoverOpened}
              onClick={() => {
                setPopoverOpened((opened) => !opened);
              }}
            >
              {activeItems.length > 0 ? (
                <IconBellRinging size={20} />
              ) : (
                <IconBell size={20} />
              )}
            </ActionIcon>
            {activeItems.length > 0 ? (
              <Badge
                size="xs"
                circle
                color="red"
                style={{
                  position: "absolute",
                  top: -2,
                  right: -2,
                  pointerEvents: "none",
                }}
              >
                {activeItems.length > 99 ? "99+" : String(activeItems.length)}
              </Badge>
            ) : null}
          </Box>
        </Popover.Target>
        <Popover.Dropdown p={0}>
          <Stack gap={0}>
            <Group justify="space-between" p="sm">
              <Title order={5}>Notifications</Title>
              <Badge variant="light">{activeItems.length} active</Badge>
            </Group>
            <Divider />
            <ScrollArea.Autosize mah={360} type="scroll">
              {activeNotificationsQuery.isLoading ? (
                <Text p="sm">Loading...</Text>
              ) : activeNotificationsQuery.isError ? (
                <Text p="sm" c="red">
                  Unable to load notifications.
                </Text>
              ) : (
                <Stack gap={0}>
                  <NotificationSection
                    title="Active"
                    notifications={activeItems}
                    emptyText="No active notifications."
                    onOpen={(notification) => {
                      updateNotificationState(notification, "read");
                      setSelectedNotification(notification);
                    }}
                    onDismiss={(notification) => {
                      updateNotificationState(notification, "dismissed");
                    }}
                    showNewBadge
                  />
                  <NotificationSection
                    title="Read"
                    notifications={readItems}
                    emptyText="No read notifications."
                    onOpen={(notification) => {
                      updateNotificationState(notification, "read");
                      setSelectedNotification(notification);
                    }}
                    onDismiss={(notification) => {
                      updateNotificationState(notification, "dismissed");
                    }}
                  />
                </Stack>
              )}
            </ScrollArea.Autosize>
          </Stack>
        </Popover.Dropdown>
      </Popover>

      <Modal
        zIndex={1200}
        opened={selectedNotification != null}
        onClose={() => {
          setSelectedNotification(null);
        }}
        title={selectedNotification?.subject ?? "Notification"}
        centered
        size="md"
      >
        {selectedNotification == null ? null : (
          <Stack>
            <Text size="sm" c="dimmed">
              Triggered by {selectedNotification.payload.automationName}
            </Text>
            <Text style={{ whiteSpace: "pre-wrap" }}>
              {selectedNotification.content}
            </Text>
          </Stack>
        )}
      </Modal>
    </>
  );
}

interface NotificationSectionProps {
  title: string;
  notifications: IActiveNotification[];
  emptyText: string;
  onOpen: (notification: IActiveNotification) => void;
  onDismiss: (notification: IActiveNotification) => void;
  showNewBadge?: boolean;
}

function NotificationSection({
  title,
  notifications,
  emptyText,
  onOpen,
  onDismiss,
  showNewBadge = false,
}: NotificationSectionProps) {
  return (
    <>
      <Group justify="space-between" p="sm">
        <Text fw={600}>{title}</Text>
        <Badge variant="default">{notifications.length}</Badge>
      </Group>
      <Divider />
      {notifications.length === 0 ? (
        <Text p="sm" c="dimmed">
          {emptyText}
        </Text>
      ) : (
        notifications.map((notification, index) => (
          <Box key={notification.notificationId}>
            <Group align="flex-start" wrap="nowrap" p="sm">
              <UnstyledButton
                style={{
                  display: "block",
                  flex: 1,
                  textAlign: "left",
                }}
                onClick={() => {
                  onOpen(notification);
                }}
              >
                <Stack gap={4} align="stretch">
                  <Group
                    justify="space-between"
                    align="flex-start"
                    wrap="nowrap"
                  >
                    <Text fw={600} ta="left">
                      {notification.subject}
                    </Text>
                    {showNewBadge ? <Badge color="red">New</Badge> : null}
                  </Group>
                  <Text size="sm" c="dimmed" ta="left">
                    {notification.payload.automationName}
                  </Text>
                  <Text size="sm" lineClamp={2} ta="left">
                    {notification.content}
                  </Text>
                </Stack>
              </UnstyledButton>
              <ActionIcon
                variant="subtle"
                color="gray"
                aria-label="Dismiss notification"
                onClick={() => {
                  onDismiss(notification);
                }}
              >
                <IconX size={16} />
              </ActionIcon>
            </Group>
            {index < notifications.length - 1 ? <Divider /> : null}
          </Box>
        ))
      )}
    </>
  );
}

function loadNotificationStates(): StoredNotificationStateMap {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const storedValue = window.localStorage.getItem(
      NOTIFICATION_STATE_STORAGE_KEY,
    );
    if (!storedValue) {
      return {};
    }

    const parsedValue = JSON.parse(storedValue) as StoredNotificationStateMap;
    return syncNotificationStates(parsedValue);
  } catch {
    return {};
  }
}

function persistNotificationStates(
  notificationStates: StoredNotificationStateMap,
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    NOTIFICATION_STATE_STORAGE_KEY,
    JSON.stringify(notificationStates),
  );
}

function syncNotificationStates(
  notificationStates: StoredNotificationStateMap,
  activeNotifications?: IActiveNotification[],
): StoredNotificationStateMap {
  const now = Date.now();
  let changed = false;
  const activeNotificationKeys = activeNotifications
    ? new Set(
        activeNotifications.map((notification) =>
          getNotificationStateKey(notification),
        ),
      )
    : null;

  const nextNotificationStates = Object.fromEntries(
    Object.entries(notificationStates).filter(
      ([notificationKey, storedState]) => {
        const keepEntry =
          storedState.expiresAt > now &&
          (activeNotificationKeys === null ||
            activeNotificationKeys.has(notificationKey));

        if (!keepEntry) {
          changed = true;
        }
        return keepEntry;
      },
    ),
  );

  if (!changed) {
    return notificationStates;
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      NOTIFICATION_STATE_STORAGE_KEY,
      JSON.stringify(nextNotificationStates),
    );
  }

  return nextNotificationStates;
}

function getNotificationStateKey(notification: IActiveNotification) {
  return String(notification.notificationId);
}

function getNotificationDisplayState(
  notification: IActiveNotification,
  notificationStates: StoredNotificationStateMap,
): NotificationDisplayState {
  const storedState = notificationStates[getNotificationStateKey(notification)];

  if (!storedState || storedState.expiresAt <= Date.now()) {
    return "active";
  }

  return storedState.state;
}
