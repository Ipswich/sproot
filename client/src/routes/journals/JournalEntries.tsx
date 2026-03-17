import { useEffect, useState, useRef, type ElementType } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { getJournalsAsync } from "@sproot/sproot-client/src/requests/requests_v2";
import { ActionIcon, Group, Text, Stack, Badge, Button, Menu, ScrollArea } from "@mantine/core";
import { IconEdit } from "@tabler/icons-react";
import EditJournalModal from "./EditJournalModal";
import { IconArrowLeft } from "@tabler/icons-react";
import { getIcon } from "./utils/getIcon";
import { SDBJournal } from "@sproot/database/SDBJournal";
import { SDBJournalTag } from "@sproot/database/SDBJournalTag";
import { useDisclosure } from "@mantine/hooks";
import NewJournalEntryModal from "./NewJournalEntryModal";
import JournalEntryCard from "./JournalEntryCard";
import { getJournalEntriesAsync } from "@sproot/sproot-client/src/requests/requests_v2";
import TagsPillsCombo from "./TagsPillsCombo";
import { journalEntriesFiltersKey } from "../utility/LocalStorageKeys";
import ManageJournalEntryTagsModal from "./ManageJournalEntryTagsModal";

export default function JournalEntries() {
  const { journalId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [entryModalOpened, { open: openEntryModal, close: closeEntryModal }] =
    useDisclosure(false);

  const [editJournalOpened, { open: openEditJournal, close: closeEditJournal }] =
    useDisclosure(false);

  const [entryTagsModalOpened, { open: openEntryTagsModal, close: closeEntryTagsModal }] =
    useDisclosure(false);

  const journalsQuery = useQuery({
    queryKey: ["journals"],
    queryFn: () => getJournalsAsync(),
  });

  const journal = (journalsQuery.data ?? []).find(
    (j) => String(j.journal.id) === String(journalId),
  ) as { journal: SDBJournal; tags?: SDBJournalTag[] } | undefined;

  const IconComp = getIcon(journal?.journal.icon ?? "NullIcon") as ElementType | null;

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

  return (
    <div style={{ padding: 20 }}>
      <Group style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <ActionIcon variant="light" onClick={() => navigate(-1)} title="Back">
          <IconArrowLeft />
        </ActionIcon>
        {journal ? (
          <ActionIcon variant="light" onClick={() => openEditJournal()} title="Edit journal">
            <IconEdit />
          </ActionIcon>
        ) : (
          <div />
        )}
      </Group>

      <Stack>
        <div style={{ marginBottom: 0 }}>
          {journal?.journal.icon ? (
            <div
              style={{
                float: "left",
                width: 44,
                height: 44,
                display: "grid",
                placeItems: "center",
                borderRadius: 8,
                background: journal?.journal.color ?? "#f1f3f5",
                marginTop: 4,
                marginRight: 12,
              }}
            >
              {IconComp ? (
                <IconComp size={22} color={readableTextColor(journal?.journal.color ?? "#f1f3f5")} />
              ) : null}
            </div>
          ) : null}
          <div>
            {journal?.journal.description && String(journal.journal.description).trim() ? (
              <>
                <Text size="sm" color="dimmed" style={{ margin: 0 }}>
                  {journal?.journal.description}
                </Text>
              </>
            ) : null}

            {journal?.tags && journal.tags.length > 0 ? (
              <div style={{ marginTop: journal?.journal.description ? 12 : 0, display: "block", width: "100%" }}>
                <Group wrap="wrap" style={{ justifyContent: "flex-start" }}>
                  {journal.tags.map((t) => (
                    <Badge key={t.id} color={t.color ?? "gray"} radius="sm">
                      {t.name}
                    </Badge>
                  ))}
                </Group>
              </div>
            ) : null}
          </div>
          <div style={{ clear: "both" }} />
        </div>

        <div>
          <Text fw={600}>Entries</Text>
        </div>
        <div>
          {journal ? (
            <JournalEntriesList journalId={Number(journalId ?? 0)} />
          ) : (
            <Text size="sm" color="dimmed">No journal selected</Text>
          )}
        </div>
        <Group justify="center" mt="md">
          <Button size="sm" onClick={() => openEntryModal()}>
            Add Entry
          </Button>
        </Group>
        <Group justify="center" mt="sm">
          <Button size="sm" variant="outline" onClick={() => openEntryTagsModal()}>
            Manage Entry Tags
          </Button>
        </Group>
        <NewJournalEntryModal
          modalOpened={entryModalOpened}
          closeModal={() => closeEntryModal()}
          journalId={Number(journalId ?? 0)}
          onCreated={async () => {
            try {
              await queryClient.fetchQuery({ queryKey: ["journals"], queryFn: () => getJournalsAsync() });
            } catch {
              // ignore
            }
          }}
        />
        <ManageJournalEntryTagsModal
          modalOpened={entryTagsModalOpened}
          closeModal={() => closeEntryTagsModal()}
        />
        {journal ? (
          <EditJournalModal
            modalOpened={editJournalOpened}
            closeModal={() => closeEditJournal()}
            journal={journal.journal}
            tags={journal.tags ?? []}
            onSaved={async () => {
              try {
                await journalsQuery.refetch();
              } catch {
                // ignore
              }
              closeEditJournal();
            }}
            onDeleted={async () => {
              try {
                await journalsQuery.refetch();
              } catch {
                // ignore
              }
              closeEditJournal();
              navigate(-1);
            }}
          />
        ) : null}
      </Stack>
    </div>
  );
}

  function JournalEntriesList({ journalId }: { journalId: number }) {
    const entriesQuery = useQuery({
      queryKey: ["journal-entries", journalId],
      queryFn: () => getJournalEntriesAsync(journalId),
    });

    const [filters, setFilters] = useState<string[]>([]);
      const [sortBy, setSortBy] = useState<string>("createdAt");
      const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
      const [isSorting, setIsSorting] = useState(false);
      const firstRenderRef = useRef(true);

    useEffect(() => {
      if ((entriesQuery.data ?? []).length > 0 && filters.length === 0) {
        if (localStorage.getItem(journalEntriesFiltersKey())) {
          setFilters(JSON.parse(localStorage.getItem(journalEntriesFiltersKey()) || "[]"));
        } else {
          // default to all tags selected
          const allTagIds = (entriesQuery.data ?? [])
            .flatMap((r) => r.tags ?? [])
            .map((t) => ({ id: t.id, name: t.name }))
            .filter((v, i, a) => a.findIndex((x) => x.id === v.id) === i)
            .map((t) => `tag:${t.id}`);
          setFilters([...allTagIds]);
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entriesQuery.data]);


    // build tag list from entries
    const tagMap = new Map<number, { id: number; name?: string | null; color?: string | null }>();
    (entriesQuery.data ?? []).forEach((r) => {
      (r.tags ?? []).forEach((t) => {
        if (t && typeof t.id === "number") tagMap.set(t.id, { id: t.id, name: t.name, color: t.color });
      });
    });
    const allTags = Array.from(tagMap.values()).sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }));

    const selectedTagIds = filters.filter((f) => f.startsWith("tag:")).map((f) => Number(f.replace(/^tag:/, "")));

    const filtered = (entriesQuery.data ?? []).filter((r) => {
      if (!filters || filters.length === 0) return true;
      const entryTagIds = (r.tags ?? []).map((t) => t.id);
      if (selectedTagIds.length === 0) return true;
      return entryTagIds.some((id) => selectedTagIds.includes(id));
    });

    const cmp = (a: typeof filtered[number], b: typeof filtered[number]) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const getVal = (x: typeof filtered[number]) => {
        if (sortBy === "name") return String(x.entry.title ?? "").toLowerCase();
          if (sortBy === "createdAt") return x.entry.createdAt ? new Date(x.entry.createdAt).getTime() : null;
        return String(x.entry.title ?? "").toLowerCase();
      };
      const va = getVal(a);
      const vb = getVal(b);
      if (va === vb) return 0;
      if (va === null || va === undefined) return 1 * dir;
      if (vb === null || vb === undefined) return -1 * dir;
      if (typeof va === "string" && typeof vb === "string") return va.localeCompare(vb) * dir;
      return (va > vb ? 1 : -1) * dir;
    };

    const sorted = [...filtered].sort(cmp);

    // animate list like Journals.tsx: staggered enter/leave transitions
    type EntryRow = typeof filtered[number];
    type EntryRowWithKey = EntryRow & { key: string; leaving?: boolean; appearing?: boolean };

    const [visibleRows, setVisibleRows] = useState<EntryRowWithKey[]>([]);
    const staggerMs = 40;

    const visibleRowsKey = JSON.stringify(
      sorted.map((s) => ({ id: s.entry.id, tagIds: (s.tags ?? []).map((t) => t.id).sort() })),
    );

    useEffect(() => {
      setVisibleRows((prev) => {
        const sortedKeys = sorted.map((s) => String(s.entry.id));
        const currentMap = new Map(prev.map((r) => [r.key, r]));

        const next: EntryRowWithKey[] = [];
        sorted.forEach((s) => {
          const k = String(s.entry.id);
          const existing = currentMap.get(k);
          if (existing) {
            next.push({
              ...existing,
              leaving: false,
              entry: s.entry,
              tags: s.tags ?? null,
            });
          } else {
            next.push({ key: k, entry: s.entry, tags: s.tags ?? null, appearing: true } as EntryRowWithKey);
          }
        });

        prev.forEach((r) => {
          if (!sortedKeys.includes(r.key)) {
            next.push({ ...r, leaving: true, appearing: false });
          }
        });

        return next;
      });

      const clearT = setTimeout(() => {
        setVisibleRows((prev) => prev.map((p) => (p.appearing ? { ...p, appearing: false } : p)));
      }, 20);

      const removeT = setTimeout(() => {
        setVisibleRows((prev) => prev.filter((p) => !p.leaving));
      }, 400);

      return () => {
        clearTimeout(clearT);
        clearTimeout(removeT);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visibleRowsKey]);

    // trigger a brief hidden state to enable staggered transitions when sort/filter changes
    useEffect(() => {
      if (firstRenderRef.current) {
        firstRenderRef.current = false;
        return;
      }
      setIsSorting(true);
      const t = setTimeout(() => setIsSorting(false), 20);
      return () => clearTimeout(t);
    }, [sortBy, sortDir, filters]);

    // initialize visibleRows on first load
    useEffect(() => {
      if (visibleRows.length === 0 && sorted.length > 0) {
        setVisibleRows(
          sorted.map((s) => ({ key: String(s.entry.id), entry: s.entry, tags: s.tags ?? null } as EntryRowWithKey)),
        );
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (entriesQuery.isLoading) return <div>Loading entries...</div>;
    if (!entriesQuery.data || entriesQuery.data.length === 0)
      return (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Text size="sm" color="dimmed">No entries yet</Text>
        </div>
      );

    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <TagsPillsCombo
              allTags={[...allTags]}
              value={filters}
              onChange={(newFilters) => {
                setFilters(newFilters);
                localStorage.setItem(journalEntriesFiltersKey(), JSON.stringify(newFilters));
              }}
              placeholder="Filter entries"
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Menu withinPortal={false} position="bottom-end">
              <Menu.Target>
                <Button variant="outline" size="sm">{sortBy === "name" ? "Name" : "Created"} {sortDir === "asc" ? "↑" : "↓"}</Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item onClick={() => { if (sortBy === "name") setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortBy("name"); setSortDir("asc"); } }}>Name {sortBy === "name" ? (sortDir === "asc" ? " ↑" : " ↓") : null}</Menu.Item>
                <Menu.Item onClick={() => { if (sortBy === "createdAt") setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortBy("createdAt"); setSortDir("desc"); } }}>Created {sortBy === "createdAt" ? (sortDir === "asc" ? " ↑" : " ↓") : null}</Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </div>
        </div>

        <ScrollArea
          h="calc(80vh - 176px)"
          style={{ width: 'calc(100% + 24px)', marginLeft: -12 }}
          scrollbarSize={8}
          offsetScrollbars
        >
          <div style={{ width: '100%', paddingRight: 20, paddingLeft: 12 }}>
            {visibleRows.map((r, idx) => {
            const delay = idx * staggerMs;
            const isHidden = r.leaving || r.appearing || isSorting;
            const cardStyle = {
              transition: `transform 300ms cubic-bezier(.2,.8,.2,1) ${delay}ms, opacity 300ms ease ${delay}ms`,
              opacity: isHidden ? 0 : 1,
              transform: isHidden ? "translateY(-8px)" : "translateY(0)",
            } as React.CSSProperties;

            return (
              <div key={r.key} style={{ ...cardStyle, marginBottom: 12 }}>
                <JournalEntryCard key={String(r.entry.id)} entry={r.entry} tags={r.tags ?? []} />
              </div>
            );
            })}
          </div>
        </ScrollArea>
      </div>
    );
  }
