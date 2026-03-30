import { SDBJournal } from "@sproot/database/SDBJournal";
import { SDBJournalTag } from "@sproot/database/SDBJournalTag";
import { Fragment, useState, useEffect, type ElementType } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Group, Text, Stack } from "@mantine/core";
import { getIcon } from "./utils/getIcon";
import { readableTextColor } from "./utils/readableTextColor";
import CardWrapper from "./utils/cards/CardWrapper";
import TagBadge from "./utils/tags/TagBadge";

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

  const bg = journal.color ?? "#f1f3f5";
  const iconColor = readableTextColor(bg);
  const IconComp = getIcon(journal.icon ?? "NullIcon") as ElementType | null;

  return (
    <Fragment>
      <CardWrapper onClick={() => navigate(`/journals/${journal.id}`)}>
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
                <TagBadge key={t.id} tag={t} />
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
      </CardWrapper>
    </Fragment>
  );
}
