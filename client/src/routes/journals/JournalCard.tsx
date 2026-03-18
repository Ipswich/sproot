import { SDBJournal } from "@sproot/database/SDBJournal";
import { SDBJournalTag } from "@sproot/database/SDBJournalTag";
import { Fragment, useState, useEffect, type ElementType } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Badge, Group, Text, Stack } from "@mantine/core";
import { getIcon } from "./utils/getIcon";

export interface JournalCardProps {
  journal: SDBJournal;
  tags: SDBJournalTag[];
  onSaved?: (updated: SDBJournal) => void;
  onDeleted?: (id: number) => void;
}

export default function JournalCard({ journal, tags }: JournalCardProps) {
  const [localTags, setLocalTags] = useState<SDBJournalTag[]>([]);

  const navigate = useNavigate();

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
        withBorder
        shadow="sm"
        padding="sm"
        radius="md"
        style={{
          cursor: "pointer",
          transition: "transform 150ms, box-shadow 150ms",
          background: "var(--mantine-color-white, #fff)",
          borderColor: "rgba(15, 23, 42, 0.06)",
        }}
        onClick={() => navigate(`/journals/${journal.id}`)}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
          e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.06)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "";
        }}
      >
        <Stack style={{ gap: 6 }}>
          <Group style={{ alignItems: "center", gap: 10, minWidth: 0 }}>
            {journal.icon ? (
              <div
                style={{
                  width: 40,
                  height: 40,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 8,
                  background: bg,
                  minWidth: 40,
                  flexShrink: 0,
                }}
              >
                {IconComp ? <IconComp size={20} color={iconColor} /> : null}
              </div>
            ) : null}

            <div
              style={{
                minWidth: 0,
                width: "100%",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <Text
                fw={700}
                style={{
                  lineHeight: 1.15,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  display: "block",
                  width: "100%",
                }}
              >
                {journal.title}
              </Text>
              <Text
                fz="sm"
                c="dimmed"
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  display: "block",
                  width: "100%",
                  marginTop: 0,
                }}
              >
                {journal.description ?? ""}
              </Text>
            </div>

            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: 6,
                flexShrink: 0,
              }}
            >
              {journal.archived ? (
                <Badge
                  variant="dot"
                  color="gray"
                  style={{ borderRadius: 6, padding: "4px 8px" }}
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
            </div>
          </Group>

          {localTags && localTags.length > 0 ? (
            <Group wrap="wrap">
              {localTags.map((t) => (
                <Badge
                  key={t.id}
                  color={t.color ?? "gray"}
                  radius="sm"
                  size="sm"
                  style={{ padding: "3px 6px" }}
                >
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
    </Fragment>
  );
}
