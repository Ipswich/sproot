import { Fragment } from "react";
import { Card, Text, Stack, Group, Badge } from "@mantine/core";
import { SDBJournalEntry } from "@sproot/database/SDBJournalEntry";
import { SDBJournalEntryTag } from "@sproot/database/SDBJournalEntryTag";

export interface JournalEntryCardProps {
  entry: SDBJournalEntry;
  tags?: SDBJournalEntryTag[];
  onClick?: () => void;
}

export default function JournalEntryCard({
  entry,
  tags,
  onClick,
}: JournalEntryCardProps) {
  return (
    <Fragment>
      <Card
        withBorder
        shadow="sm"
        padding="sm"
        radius="md"
        style={{
          cursor: onClick ? "pointer" : "default",
          transition: "transform 150ms, box-shadow 150ms",
          background: "var(--mantine-color-white, #fff)",
          borderColor: "rgba(15, 23, 42, 0.06)",
        }}
        onClick={() => onClick?.()}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-6px)";
          e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "";
        }}
      >
        <Stack style={{ gap: 6 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              minWidth: 0,
            }}
          >
            <div style={{ minWidth: 0, width: "100%" }}>
              <Text fw={700} style={{ lineHeight: 1 }}>
                {entry.title ?? "Untitled"}
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
                  marginTop: 4,
                }}
              >
                {entry.content ?? ""}
              </Text>
            </div>
          </div>

          {tags && tags.length > 0 ? (
            <Group wrap="wrap" style={{ gap: 6 }}>
              {tags.map((t) => (
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
            {entry.createdAt ? (
              <Text fz="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
                {(() => {
                  try {
                    const d = new Date(entry.createdAt);
                    return `Created ${d.toLocaleString()}`;
                  } catch {
                    return "Created";
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
