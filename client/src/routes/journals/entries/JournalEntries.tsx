import { useEffect, useState, useRef, type ElementType } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { getJournalsAsync } from "@sproot/sproot-client/src/requests/requests_v2";
import {
  ActionIcon,
  Group,
  Text,
  Stack,
  Badge,
  Button,
  Menu,
  ScrollArea,
  Box,
  rem,
  LoadingOverlay,
  Switch,
} from "@mantine/core";
import { IconEdit } from "@tabler/icons-react";
import EditJournalModal from "../EditJournalModal";
import {
  IconArrowLeft,
  IconSortAscending,
  IconSortDescending,
} from "@tabler/icons-react";
import { getIcon } from "../utils/getIcon";
import { readableTextColor } from "../utils/readableTextColor";
import { SDBJournal } from "@sproot/database/SDBJournal";
import { SDBJournalTag } from "@sproot/database/SDBJournalTag";
import { useDisclosure } from "@mantine/hooks";
import NewJournalEntryModal from "./NewJournalEntryModal";
import JournalEntryCard from "./JournalEntryCard";
import { getJournalEntriesAsync } from "@sproot/sproot-client/src/requests/requests_v2";
import TagsPillsCombo from "../utils/tags/TagsPillsCombo";
import {
  journalEntriesFiltersKey,
  journalEntriesSortKey,
} from "../../utility/LocalStorageKeys";
import ManageJournalEntryTagsModal from "./ManageJournalEntryTagsModal";
import PopoverDatePickerInput from "../../../components/PopoverDatePickerInput";

export default function JournalEntries() {
  const { journalId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [entryModalOpened, { open: openEntryModal, close: closeEntryModal }] =
    useDisclosure(false);

  const [
    editJournalOpened,
    { open: openEditJournal, close: closeEditJournal },
  ] = useDisclosure(false);

  const [
    entryTagsModalOpened,
    { open: openEntryTagsModal, close: closeEntryTagsModal },
  ] = useDisclosure(false);

  const journalsQuery = useQuery({
    queryKey: ["journals"],
    queryFn: () => getJournalsAsync(),
  });

  const journal = (journalsQuery.data ?? []).find(
    (j) => String(j.journal.id) === String(journalId),
  ) as { journal: SDBJournal; tags?: SDBJournalTag[] } | undefined;

  const IconComp = getIcon(
    journal?.journal.icon ?? "NullIcon",
  ) as ElementType | null;

  return (
    <Box p={20}>
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
            onClick={() => navigate("/journals")}
            title="Back"
          >
            <IconArrowLeft />
          </ActionIcon>
          <Text
            fw={700}
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              display: "block",
              flex: 1,
              minWidth: 0,
            }}
          >
            {journal?.journal.title ?? "Journals"}
          </Text>
        </Group>
        {journal ? (
          <ActionIcon
            variant="light"
            onClick={() => openEditJournal()}
            title="Edit journal"
          >
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
                <IconComp
                  size={22}
                  color={readableTextColor(journal?.journal.color ?? "#f1f3f5")}
                />
              ) : null}
            </div>
          ) : null}
          <div>
            {journal?.journal.description &&
            String(journal.journal.description).trim() ? (
              <>
                <Text size="sm" style={{ margin: 0 }}>
                  {journal?.journal.description}
                </Text>
              </>
            ) : null}

            {journal?.tags && journal.tags.length > 0 ? (
              <div
                style={{
                  marginTop: journal?.journal.description ? 12 : 0,
                  display: "block",
                  width: "100%",
                }}
              >
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
          {journal ? (
            <JournalEntriesList journalId={Number(journalId ?? 0)} />
          ) : (
            <Text size="sm" color="dimmed">
              No journal selected
            </Text>
          )}
        </div>
        <Group justify="center" mt="md">
          <Button size="xl" w={rem(300)} onClick={() => openEntryModal()}>
            Add New
          </Button>
        </Group>
        <Group justify="center" mt="sm">
          <Button size="sm" w={rem(200)} onClick={() => openEntryTagsModal()}>
            Manage Entry Tags
          </Button>
        </Group>
        <NewJournalEntryModal
          modalOpened={entryModalOpened}
          closeModal={() => closeEntryModal()}
          journalId={Number(journalId ?? 0)}
          onCreated={async () => {
            try {
              await queryClient.fetchQuery({
                queryKey: ["journals"],
                queryFn: () => getJournalsAsync(),
              });
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
              navigate("/journals");
            }}
          />
        ) : null}
      </Stack>
    </Box>
  );
}

function JournalEntriesList({ journalId }: { journalId: number }) {
  const navigate = useNavigate();
  const entriesQuery = useQuery({
    queryKey: ["journal-entries", journalId],
    queryFn: () => getJournalEntriesAsync(journalId, false),
  });

  const [filters, setFilters] = useState<string[]>([]);
  const [dateRangeExact, setDateRangeExact] = useState<
    [Date | null, Date | null]
  >([null, null]);
  const [ignoreYear, setIgnoreYear] = useState(false);
  const [sortBy, setSortBy] = useState<string>(() => {
    try {
      const s = localStorage.getItem(journalEntriesSortKey());
      if (s) {
        const o = JSON.parse(s);
        return o?.sortBy ?? "createdAt";
      }
    } catch {
      /* ignore */
    }
    return "createdAt";
  });
  const [sortDir, setSortDir] = useState<"asc" | "desc">(() => {
    try {
      const s = localStorage.getItem(journalEntriesSortKey());
      if (s) {
        const o = JSON.parse(s);
        return o?.sortDir ?? "desc";
      }
    } catch {
      /* ignore */
    }
    return "desc";
  });

  useEffect(() => {
    try {
      localStorage.setItem(
        journalEntriesSortKey(),
        JSON.stringify({ sortBy, sortDir }),
      );
    } catch {
      /* ignore */
    }
  }, [sortBy, sortDir]);
  const [isSorting, setIsSorting] = useState(false);
  const firstRenderRef = useRef(true);

  useEffect(() => {
    if ((entriesQuery.data ?? []).length > 0 && filters.length === 0) {
      const stored = localStorage.getItem(journalEntriesFiltersKey());
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as string[];
          // Build allowed tag strings from current entries (only real tags)
          const allTagIds = (entriesQuery.data ?? [])
            .flatMap((r) => r.tags ?? [])
            .map((t) => t.id)
            .filter((v, i, a) => a.indexOf(v) === i);
          const allowed = new Set(allTagIds.map((id) => `tag:${id}`));
          const sanitized = parsed.filter((f) => {
            if (!f.startsWith("tag:")) return false;
            return allowed.has(f);
          });
          if (sanitized.length !== parsed.length) {
            try {
              localStorage.setItem(
                journalEntriesFiltersKey(),
                JSON.stringify(sanitized),
              );
            } catch {
              // ignore localStorage errors
            }
          }
          setFilters(sanitized);
        } catch {
          setFilters([]);
        }
      } else {
        setFilters([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entriesQuery.data]);

  // build tag list from entries
  const tagMap = new Map<
    number,
    { id: number; name?: string | null; color?: string | null }
  >();
  (entriesQuery.data ?? []).forEach((r) => {
    (r.tags ?? []).forEach((t) => {
      if (t && typeof t.id === "number")
        tagMap.set(t.id, { id: t.id, name: t.name, color: t.color });
    });
  });
  const allTags = Array.from(tagMap.values()).sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", undefined, {
      sensitivity: "base",
    }),
  );

  // Keep filters in sync when tags are removed elsewhere (e.g. deleted)
  useEffect(() => {
    if (filters.length === 0) return;
    const allowed = new Set(allTags.map((t) => `tag:${t.id}`));
    const sanitized = filters.filter((f) => {
      if (!f.startsWith("tag:")) return false;
      return allowed.has(f);
    });
    if (sanitized.length !== filters.length) {
      setFilters(sanitized);
      try {
        localStorage.setItem(
          journalEntriesFiltersKey(),
          JSON.stringify(sanitized),
        );
      } catch {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTags]);

  const selectedTagIds = filters
    .filter((f) => f.startsWith("tag:"))
    .map((f) => Number(f.replace(/^tag:/, "")));
  const filtered = (entriesQuery.data ?? []).filter((r) => {
    const entryTagIds = (r.tags ?? []).map((t) => t.id);
    const tagActive = selectedTagIds && selectedTagIds.length > 0;
    const tagMatch = tagActive
      ? entryTagIds.some((id) => selectedTagIds.includes(id))
      : false;

    // date-range presence
    const hasRange = Boolean(
      dateRangeExact && (dateRangeExact[0] || dateRangeExact[1]),
    );
    const created = r.entry.createdAt ? new Date(r.entry.createdAt) : null;
    const dateActive = hasRange && !!created;

    // compute dateMatch if needed
    let dateMatch = true;
    if (dateActive && created) {
      const start = dateRangeExact[0];
      const end = dateRangeExact[1];
      if (!ignoreYear) {
        if (start && end) {
          const s = new Date(start);
          s.setHours(0, 0, 0, 0);
          const e = new Date(end);
          e.setHours(23, 59, 59, 999);
          dateMatch = created >= s && created <= e;
        } else if (start && !end) {
          const s = new Date(start);
          s.setHours(0, 0, 0, 0);
          const e = new Date(start);
          e.setHours(23, 59, 59, 999);
          dateMatch = created >= s && created <= e;
        } else if (!start && end) {
          const s = new Date(end);
          s.setHours(0, 0, 0, 0);
          const e = new Date(end);
          e.setHours(23, 59, 59, 999);
          dateMatch = created >= s && created <= e;
        }
      } else {
        const toOrd = (d: Date) => d.getMonth() * 100 + d.getDate();
        const cOrd = toOrd(created);
        if (start && end) {
          const sOrd = toOrd(start);
          const eOrd = toOrd(end);
          if (sOrd <= eOrd) dateMatch = cOrd >= sOrd && cOrd <= eOrd;
          else dateMatch = cOrd >= sOrd || cOrd <= eOrd;
        } else if (start && !end) {
          const sOrd = toOrd(start);
          dateMatch = cOrd === sOrd;
        } else if (!start && end) {
          const eOrd = toOrd(end);
          dateMatch = cOrd === eOrd;
        }
      }
    }

    // Four-case logic:
    // - no tags && no date -> show all
    // - tags only -> require tagMatch
    // - date only -> require dateMatch
    // - tags + date -> require both
    if (!tagActive && !dateActive) return true;
    if (tagActive && !dateActive) return tagMatch;
    if (!tagActive && dateActive) return dateMatch;
    return tagMatch && dateMatch;
  });

  const cmp = (a: (typeof filtered)[number], b: (typeof filtered)[number]) => {
    const dir = sortDir === "asc" ? 1 : -1;
    const getVal = (x: (typeof filtered)[number]) => {
      if (sortBy === "name") return String(x.entry.title ?? "").toLowerCase();
      if (sortBy === "createdAt")
        return x.entry.createdAt ? new Date(x.entry.createdAt).getTime() : null;
      return String(x.entry.title ?? "").toLowerCase();
    };
    const va = getVal(a);
    const vb = getVal(b);
    if (va === vb) return 0;
    if (va === null || va === undefined) return 1 * dir;
    if (vb === null || vb === undefined) return -1 * dir;
    if (typeof va === "string" && typeof vb === "string")
      return va.localeCompare(vb) * dir;
    return (va > vb ? 1 : -1) * dir;
  };

  const sorted = [...filtered].sort(cmp);

  // animate list like Journals.tsx: staggered enter/leave transitions
  type EntryRow = (typeof filtered)[number];
  type EntryRowWithKey = EntryRow & {
    key: string;
    leaving?: boolean;
    appearing?: boolean;
  };

  const [visibleRows, setVisibleRows] = useState<EntryRowWithKey[]>([]);
  const staggerMs = 40;

  const visibleRowsKey = JSON.stringify(
    sorted.map((s) => ({
      id: s.entry.id,
      tagIds: (s.tags ?? []).map((t) => t.id).sort(),
    })),
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
          next.push({
            key: k,
            entry: s.entry,
            tags: s.tags ?? null,
            appearing: true,
          } as EntryRowWithKey);
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
      setVisibleRows((prev) =>
        prev.map((p) => (p.appearing ? { ...p, appearing: false } : p)),
      );
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
        sorted.map(
          (s) =>
            ({
              key: String(s.entry.id),
              entry: s.entry,
              tags: s.tags ?? null,
            }) as EntryRowWithKey,
        ),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (entriesQuery.isLoading)
    return (
      <Box p={20} style={{ position: "relative", height: 220 }}>
        <LoadingOverlay
          visible
          zIndex={1000}
          loaderProps={{ color: "teal", type: "bars", size: "lg" }}
        />
      </Box>
    );
  // show filter/sort bar even when there are no entries; display
  // a centered empty-state message below the controls instead of
  // returning early.

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ flex: 1 }}>
          <Stack>
            <Group>
              <div style={{ flex: 1 }}>
                <TagsPillsCombo
                  allTags={[...allTags]}
                  value={filters}
                  onChange={(newFilters: string[]) => {
                    setFilters(newFilters);
                    try {
                      localStorage.setItem(
                        journalEntriesFiltersKey(),
                        JSON.stringify(newFilters),
                      );
                    } catch {
                      // Ignore storage errors (e.g., disabled storage, quota exceeded)
                    }
                  }}
                  placeholder="Filter by tags"
                />
              </div>
              <Menu withinPortal={false} position="bottom-end">
                <Menu.Target>
                  <ActionIcon size="lg">
                    {sortDir === "asc" ? (
                      <IconSortAscending size={16} />
                    ) : (
                      <IconSortDescending size={16} />
                    )}
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item
                    onClick={() => {
                      if (sortBy === "name")
                        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                      else {
                        setSortBy("name");
                        setSortDir("asc");
                      }
                    }}
                  >
                    Name{" "}
                    {sortBy === "name"
                      ? sortDir === "asc"
                        ? " ↑"
                        : " ↓"
                      : null}
                  </Menu.Item>
                  <Menu.Item
                    onClick={() => {
                      if (sortBy === "createdAt")
                        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                      else {
                        setSortBy("createdAt");
                        setSortDir("desc");
                      }
                    }}
                  >
                    Created{" "}
                    {sortBy === "createdAt"
                      ? sortDir === "asc"
                        ? " ↑"
                        : " ↓"
                      : null}
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>

            <Group>
              <div style={{ flex: 1 }}>
                <PopoverDatePickerInput
                  size="sm"
                  type="range"
                  allowSingleDateInRange
                  value={dateRangeExact}
                  ignoreYear={ignoreYear}
                  onChange={(v: [Date | null, Date | null]) =>
                    setDateRangeExact(v ?? [null, null])
                  }
                  placeholder="Filter by date range"
                  clearable
                  dropdownContent={
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                      }}
                    >
                      <Switch
                        label="Ignore Year"
                        checked={ignoreYear}
                        onChange={(e) => setIgnoreYear(e.currentTarget.checked)}
                        size="sm"
                      />
                    </div>
                  }
                />
              </div>
            </Group>
          </Stack>
        </div>
        <div style={{ display: "flex", gap: 8 }}></div>
      </div>

      <ScrollArea
        mah="calc(80vh - 176px)"
        style={{ width: "100%" }}
        scrollbarSize={8}
        offsetScrollbars
      >
        <div style={{ width: "100%", paddingRight: 12, paddingLeft: 12 }}>
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
                <JournalEntryCard
                  key={String(r.entry.id)}
                  entry={r.entry}
                  tags={r.tags ?? []}
                  onClick={() =>
                    navigate(`/journals/${journalId}/entries/${r.entry.id}`)
                  }
                />
              </div>
            );
          })}
        </div>
      </ScrollArea>
      {visibleRows.length === 0 && (
        <div
          style={{ display: "flex", justifyContent: "center", marginTop: 12 }}
        >
          <Text size="sm" color="dimmed">
            No entries yet
          </Text>
        </div>
      )}
    </div>
  );
}
