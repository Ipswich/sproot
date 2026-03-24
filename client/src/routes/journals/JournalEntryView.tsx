import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  getJournalEntryAsync,
  getJournalsAsync,
} from "@sproot/sproot-client/src/requests/requests_v2";
import {
  Card,
  Text,
  Group,
  Badge,
  ActionIcon,
  Box,
  LoadingOverlay,
  Breadcrumbs,
  Anchor,
} from "@mantine/core";
import { IconArrowLeft, IconEdit } from "@tabler/icons-react";
import { SDBJournalEntry } from "@sproot/database/SDBJournalEntry";
import { SDBJournalEntryTag } from "@sproot/database/SDBJournalEntryTag";
import { Fragment, useState } from "react";
import EditJournalEntryModal from "./EditJournalEntryModal";

export default function JournalEntryView() {
  const { journalId, entryId } = useParams();
  const [editOpen, setEditOpen] = useState(false);
  const navigate = useNavigate();

  const entryQuery = useQuery({
    queryKey: ["journal-entry", Number(entryId ?? 0)],
    queryFn: () => getJournalEntryAsync(Number(entryId ?? 0)),
    enabled: Boolean(entryId),
  });

  const journalsQuery = useQuery({
    queryKey: ["journals"],
    queryFn: () => getJournalsAsync(),
  });

  if (entryQuery.isLoading)
    return (
      <Box pt={20} px={20} style={{ position: "relative" }}>
        <LoadingOverlay
          visible
          zIndex={1000}
          loaderProps={{ color: "teal", type: "bars", size: "lg" }}
        />
        <Box style={{ height: 180 }} />
      </Box>
    );

  const row = entryQuery.data;

  if (!row) return <div>Entry not found</div>;

  const entry: Partial<SDBJournalEntry> = row.entry;
  const tags: SDBJournalEntryTag[] = row.tags ?? [];

  const journalRow = (journalsQuery.data ?? []).find(
    (j) => String(j.journal.id) === String(journalId),
  );
  const journalTitle = journalRow ? journalRow.journal.title : undefined;

  return (
    <Fragment>
      <Box pt={20} px={20}>
        <Group
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Group
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
              flex: 1,
              minWidth: 0,
            }}
          >
            <ActionIcon
              variant="light"
              onClick={() => navigate(`/journals/${journalId ?? ""}`)}
              title="Back"
            >
              <IconArrowLeft />
            </ActionIcon>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Breadcrumbs>
                {journalTitle ? (
                  <Anchor
                    component="button"
                    onClick={() => navigate(`/journals/${journalId}`)}
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      display: "block",
                      textDecoration: "none",
                    }}
                  >
                    {journalTitle}
                  </Anchor>
                ) : (
                  <Text
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      display: "block",
                    }}
                  >
                    Journals
                  </Text>
                )}
                <Text
                  fw={700}
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    display: "block",
                    maxWidth: "100%",
                  }}
                >
                  {entry.title ?? "Untitled"}
                </Text>
              </Breadcrumbs>
            </div>
          </Group>
          <ActionIcon
            variant="light"
            onClick={() => setEditOpen(true)}
            title="Edit"
          >
            <IconEdit />
          </ActionIcon>
        </Group>
      </Box>

      <Card shadow="sm" px="md" py="xs" radius="md" withBorder>
        <div style={{ marginTop: 8 }}>
          <Text
            size="sm"
            // color="dimmed"
            style={{ whiteSpace: "pre-wrap", marginBottom: 12 }}
          >
            {entry.content ?? ""}
          </Text>

          {tags.length > 0 ? (
            <div style={{ marginBottom: 12 }}>
              <Group wrap="wrap" style={{ gap: 8 }}>
                {tags.map((t) => (
                  <Badge key={t.id} color={t.color ?? "gray"} radius="sm">
                    {t.name}
                  </Badge>
                ))}
              </Group>
            </div>
          ) : null}

          {entry.createdAt ? (
            <Text size="xs" color="dimmed">
              {(() => {
                try {
                  return `Created ${new Date(entry.createdAt).toLocaleString()}`;
                } catch {
                  return "Created";
                }
              })()}
            </Text>
          ) : null}
        </div>
      </Card>
      <EditJournalEntryModal
        modalOpened={editOpen}
        closeModal={() => setEditOpen(false)}
        journalId={Number(journalId ?? 0)}
        entry={entry}
        tags={tags}
        onSaved={async () => {
          try {
            await entryQuery.refetch();
          } catch {
            // ignore
          }
        }}
        onDeleted={async () => {
          try {
            await entryQuery.refetch();
          } catch {
            // ignore
          }
          navigate(`/journals/${journalId ?? ""}`);
        }}
      />
    </Fragment>
  );
}
