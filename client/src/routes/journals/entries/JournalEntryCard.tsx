import { Fragment } from "react";
import { Text, Stack, Group } from "@mantine/core";
import CardWrapper from "../utils/cards/CardWrapper";
import TagBadge from "../utils/tags/TagBadge";
import { SDBJournalEntry } from "@sproot/database/SDBJournalEntry";
import { SDBJournalEntryTag } from "@sproot/database/SDBJournalEntryTag";

export interface JournalEntryCardProps {
  entry: Partial<SDBJournalEntry>;
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
      <CardWrapper onClick={() => onClick?.()}>
        <Stack style={{ gap: 6, width: "100%", minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              minWidth: 0,
              width: "100%",
              maxWidth: "100%",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                minWidth: 0,
                width: "100%",
                maxWidth: "100%",
                flex: 1,
                overflow: "hidden",
              }}
            >
              <Text
                fw={700}
                lineClamp={1}
                style={{
                  lineHeight: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  display: "block",
                  width: "100%",
                  maxWidth: "100%",
                }}
              >
                {entry.title ?? "Untitled"}
              </Text>
              <Text
                fz="sm"
                c="dimmed"
                lineClamp={1}
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  display: "block",
                  width: "100%",
                  maxWidth: "100%",
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
                <TagBadge key={t.id} tag={t} />
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
      </CardWrapper>
    </Fragment>
  );
}
