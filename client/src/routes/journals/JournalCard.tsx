import { SDBJournal } from "@sproot/database/SDBJournal";
import { SDBJournalTag } from "@sproot/database/SDBJournalTag";
import { Fragment, useState, useEffect, type ElementType } from "react";
import {
  Card,
  Badge,
  Group,
  Text,
  Modal,
  ScrollArea,
  Stack,
  ActionIcon,
  TextInput,
  Button,
} from "@mantine/core";
import { getIcon } from "./utils/getIcon";
import { IconPlus, IconEdit, IconTrash } from "@tabler/icons-react";
import EditJournalModal from "./EditJournalModal";

export interface JournalCardProps {
  journal: SDBJournal;
  tags: SDBJournalTag[];
  onAddTag?: (journalId: number, name: string) => Promise<void>;
  onEditTag?: (journalId: number, tag: SDBJournalTag) => Promise<void>;
  onRemoveTag?: (journalId: number, tagId: number) => Promise<void>;
  onSaved?: (updated: SDBJournal) => void;
  onDeleted?: (id: number) => void;
}

export default function JournalCard({
  journal,
  tags,
  onAddTag,
  onEditTag,
  onRemoveTag,
  onSaved,
  onDeleted,
}: JournalCardProps) {
  const [opened, setOpened] = useState(false);
  const [editOpened, setEditOpened] = useState(false);
  const [localTags, setLocalTags] = useState<SDBJournalTag[]>([]);
  const [newTagName, setNewTagName] = useState("");

  useEffect(() => {
    setLocalTags((tags ?? []).map((t) => ({ ...t })));
  }, [tags]);

  function readableTextColor(bg: string) {
    const s = String(bg || "").trim();
    const hexMatch = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hexMatch) {
      const hexRaw = hexMatch[1];
      if (!hexRaw) return "#000";
      let hex = hexRaw;
      if (hex.length === 3)
        hex = hex
          .split("")
          .map((c) => c + c)
          .join("");
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      return lum > 160 ? "#000" : "#fff";
    }
    return "#000";
  }

  const bg = journal.color ?? "#f1f3f5";
  const iconColor = readableTextColor(bg);
  const IconComp = getIcon(
    journal.icon ?? "NullIcon",
  ) as unknown as ElementType | null;

  return (
    <Fragment>
      <Card
        shadow="sm"
        padding="lg"
        radius="md"
        style={{
          cursor: "pointer",
          transition: "transform 150ms, box-shadow 150ms",
        }}
        onClick={() => setOpened(true)}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-6px)";
          e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "";
        }}
      >
        <Stack>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 10,
                  background: bg,
                }}
              >
                {IconComp ? <IconComp size={22} color={iconColor} /> : null}
              </div>
              <div>
                <Text fw={700}>{journal.title}</Text>
                <Text fz="sm" c="dimmed">
                  {journal.description ?? ""}
                </Text>
              </div>
            </div>

            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {journal.archived ? (
                <Badge
                  variant="dot"
                  color="gray"
                  size="sm"
                  style={{ borderRadius: 6 }}
                  title={
                    journal.archivedAt
                      ? (() => {
                          try {
                            return `Archived ${new Date(journal.archivedAt).toLocaleString()}`;
                          } catch {
                            return "Archived";
                          }
                        })()
                      : "Archived"
                  }
                >
                  Archived
                </Badge>
              ) : null}

              <ActionIcon
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditOpened(true);
                }}
                title="Edit journal"
              >
                <IconEdit />
              </ActionIcon>
            </div>
          </div>

          {localTags && localTags.length > 0 ? (
            <Group wrap="wrap">
              {localTags.map((t) => (
                <Badge key={t.id} color={t.color ?? "gray"} radius="sm">
                  {t.name}
                </Badge>
              ))}
            </Group>
          ) : null}

          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            {journal.editedAt ? (
              <Text fz="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
                {(() => {
                  try {
                    const d = new Date(journal.editedAt);
                    return `Edited ${d.toLocaleString()}`;
                  } catch {
                    return "Edited";
                  }
                })()}
              </Text>
            ) : null}
          </div>
        </Stack>
      </Card>

      <EditJournalModal
        modalOpened={editOpened}
        closeModal={() => setEditOpened(false)}
        journal={journal}
        onSaved={async (updated) => {
          // update local simple fields so modal and card show new values without full refetch
          // note: tags managed separately
          try {
            journal.title = updated.title ?? journal.title;
            journal.description = updated.description ?? journal.description;
            journal.icon = updated.icon ?? journal.icon;
            journal.color = updated.color ?? journal.color;
            journal.archived = updated.archived ?? journal.archived;
            journal.archivedAt = updated.archivedAt ?? journal.archivedAt;
            setEditOpened(false);
            onSaved?.(updated);
          } catch (err) {
            // ignore errors updating local copy
            // eslint-disable-next-line no-console
            console.warn("Failed to apply updated journal locally", err);
          }
        }}
        onDeleted={(id) => {
          setEditOpened(false);
          onDeleted?.(id);
        }}
      />

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={journal.title ?? "Journal Details"}
        size="lg"
        scrollAreaComponent={ScrollArea.Autosize}
      >
        <Stack>
          <Text fz="sm" c="dimmed">
            {journal.description ?? "No description available."}
          </Text>

          <div>
            <Text fw={600} style={{ marginBottom: 8 }}>
              Tags
            </Text>
            <Group align="center" style={{ marginBottom: 8 }}>
              {(localTags ?? []).map((t) => (
                <Group key={t.id} align="center">
                  <Badge color={t.color ?? "gray"} variant="light">
                    {t.name}
                  </Badge>
                  <ActionIcon
                    size="sm"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const updated = {
                        ...t,
                        name: `${t.name}`,
                      } as SDBJournalTag;
                      if (onEditTag) await onEditTag(journal.id, updated);
                    }}
                  >
                    <IconEdit size={14} />
                  </ActionIcon>
                  <ActionIcon
                    size="sm"
                    color="red"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (onRemoveTag) await onRemoveTag(journal.id, t.id);
                      setLocalTags((prev) => prev.filter((x) => x.id !== t.id));
                    }}
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Group>
              ))}
            </Group>

            <Group style={{ marginTop: 8 }}>
              <TextInput
                placeholder="New tag"
                value={newTagName}
                onChange={(e) => setNewTagName(e.currentTarget.value)}
              />
              <Button
                onClick={async () => {
                  if (!newTagName.trim()) return;
                  if (onAddTag) await onAddTag(journal.id, newTagName.trim());
                  const created = {
                    id: Date.now(),
                    journalId: journal.id,
                    name: newTagName.trim(),
                  } as unknown as SDBJournalTag;
                  setLocalTags((prev) => [...prev, created]);
                  setNewTagName("");
                }}
              >
                <IconPlus style={{ marginRight: 8 }} />
                Add Tag
              </Button>
            </Group>
          </div>

          <div>
            <Text fw={600} style={{ marginBottom: 8 }}>
              Entries
            </Text>
            <Text fz="sm" c="dimmed">
              Entries view and editing will go here. Click an entry to edit or
              create a new one.
            </Text>
            <Group style={{ marginTop: 8 }}>
              <Button onClick={() => console.log("Open Add Entry Modal")}>
                Create Entry
              </Button>
            </Group>
          </div>
        </Stack>
      </Modal>
    </Fragment>
  );
}
