import { Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import {
  Button,
  Group,
  rem,
  Stack,
  Menu,
  ScrollArea,
  LoadingOverlay,
  Box,
} from "@mantine/core";

import TagsPillsCombo from "./TagsPillsCombo";
import { useQuery } from "@tanstack/react-query";
import { getJournalsAsync } from "@sproot/sproot-client/src/requests/requests_v2";
import JournalCard from "./JournalCard";
import { SDBJournal } from "@sproot/database/SDBJournal";
import { SDBJournalTag } from "@sproot/database/SDBJournalTag";
import ManageJournalTagsModal from "./ManageJournalTagsModal";
import NewJournalModal from "./NewJournalModal";
import { useDisclosure } from "@mantine/hooks";
import {
  journalsFiltersKey,
  journalsSortKey,
} from "../utility/LocalStorageKeys";

export default function Journals() {
  const getJournalsQuery = useQuery({
    queryKey: ["journals"],
    queryFn: () => getJournalsAsync(),
  });

  const [tagsModalOpened, { open: openTagsModal, close: closeTagsModal }] =
    useDisclosure(false);
  const [
    newJournalModalOpened,
    { open: openNewJournal, close: closeNewJournal },
  ] = useDisclosure(false);
  const [filters, setFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>(() => {
    try {
      const s = localStorage.getItem(journalsSortKey());
      if (s) {
        const o = JSON.parse(s);
        return o?.sortBy ?? "editedAt";
      }
    } catch {
      /* ignore */
    }
    return "editedAt";
  });
  const [sortDir, setSortDir] = useState<"asc" | "desc">(() => {
    try {
      const s = localStorage.getItem(journalsSortKey());
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
        journalsSortKey(),
        JSON.stringify({ sortBy, sortDir }),
      );
    } catch {
      /* ignore */
    }
  }, [sortBy, sortDir]);
  const [isSorting, setIsSorting] = useState(false);
  const firstRenderRef = useRef(true);

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }
    // set initial hidden state, then flip to visible to trigger staggered transitions
    setIsSorting(true);
    const t = setTimeout(() => setIsSorting(false), 20);
    return () => clearTimeout(t);
  }, [sortBy, sortDir]);

  type JournalRow = {
    journal: SDBJournal;
    tags?: SDBJournalTag[] | null;
  };

  type JournalRowWithKey = JournalRow & {
    key: string;
    leaving?: boolean;
    appearing?: boolean;
  };
  const [visibleRows, setVisibleRows] = useState<JournalRowWithKey[]>([]);

  // get "all" tags from journals
  const tagMap = new Map<
    number,
    {
      id: number;
      name?: string | null | undefined;
      color?: string | null | undefined;
    }
  >();
  (getJournalsQuery.data ?? []).forEach((j) => {
    (j.tags ?? []).forEach((t) => {
      const tt = t as unknown as {
        id?: number;
        name?: string | null;
        color?: string | null;
      };
      if (tt && typeof tt.id === "number")
        tagMap.set(tt.id, { id: tt.id, name: tt.name, color: tt.color });
    });
  });
  const allTags = Array.from(tagMap.values()).sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", undefined, {
      sensitivity: "base",
    }),
  );

  useEffect(() => {
    if ((getJournalsQuery.data ?? []).length > 0 && filters.length === 0) {
      if (localStorage.getItem(journalsFiltersKey())) {
        setFilters(
          JSON.parse(localStorage.getItem(journalsFiltersKey()) || "[]"),
        );
      } else {
        setFilters(["archived", ...allTags.map((t) => `tag:${t.id}`)]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getJournalsQuery.data]);

  // compute filtered and sorted lists for rendering and animation effects
  const filtered = (getJournalsQuery.data ?? []).filter((j) => {
    if (!j || !j.journal) return false;

    const selectedTagIds = filters
      .filter((f) => f.startsWith("tag:"))
      .map((f) => Number(f.replace(/^tag:/, "")));

    // If no filters are set, include everything.
    if (!filters || filters.length === 0) return true;

    const journalTagIds = (j.tags ?? [])
      .map((t) => {
        const tt = t as unknown as { id?: number };
        return tt && typeof tt.id === "number" ? tt.id : null;
      })
      .filter(Boolean) as number[];

    const archivedSelected = selectedTagIds.includes(-1);
    const matchesArchived = archivedSelected && j.journal.archived;
    const matchesTag =
      selectedTagIds.length > 0
        ? journalTagIds.some((id) => selectedTagIds.includes(id))
        : false;

    return matchesArchived || matchesTag;
  }) as JournalRow[];

  const cmp = (a: JournalRow, b: JournalRow) => {
    const aJ = a.journal;
    const bJ = b.journal;
    const dir = sortDir === "asc" ? 1 : -1;

    const getVal = (jObj: JournalRow["journal"]) => {
      if (sortBy === "name") return String(jObj.title ?? "").toLowerCase();
      if (sortBy === "editedAt")
        return jObj.editedAt ? new Date(jObj.editedAt).getTime() : null;
      if (sortBy === "archivedAt")
        return jObj.archivedAt ? new Date(jObj.archivedAt).getTime() : null;
      return String(jObj.title ?? "").toLowerCase();
    };

    const va = getVal(aJ);
    const vb = getVal(bJ);

    if (va === vb) return 0;
    if (va === null || va === undefined) return 1 * dir;
    if (vb === null || vb === undefined) return -1 * dir;
    if (typeof va === "string" && typeof vb === "string")
      return va.localeCompare(vb) * dir;
    return (va > vb ? 1 : -1) * dir;
  };

  const sorted = [...filtered].sort(cmp);
  const staggerMs = 40;

  // key to detect changes in order or tags so we can recompute visibleRows
  const visibleRowsKey = JSON.stringify(
    sorted.map((s) => ({
      id: s.journal.id,
      tagIds: (s.tags ?? []).map((t) => (t as { id?: number }).id).sort(),
    })),
  );

  // Manage visible rows to animate enter / leave transitions when sorted changes
  useEffect(() => {
    setVisibleRows((prev) => {
      const sortedKeys = sorted.map((s) => String(s.journal.id));
      const currentMap = new Map(prev.map((r) => [r.key, r]));

      const next: JournalRowWithKey[] = [];
      sorted.forEach((s) => {
        const k = String(s.journal.id);
        const existing = currentMap.get(k);
        if (existing) {
          next.push({
            ...existing,
            leaving: false,
            // update content with latest journal/tags so cards receive fresh props
            journal: s.journal,
            tags: s.tags ?? null,
          });
        } else {
          next.push({
            key: k,
            journal: s.journal,
            tags: s.tags ?? null,
            appearing: true,
          });
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

  // initialize visibleRows on first load
  useEffect(() => {
    if (visibleRows.length === 0 && sorted.length > 0) {
      setVisibleRows(
        sorted.map((s) => ({
          key: String(s.journal.id),
          journal: s.journal,
          tags: s.tags ?? null,
        })),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Fragment>
      <div style={{ position: "relative" }}>
        <LoadingOverlay
          visible={getJournalsQuery.isLoading}
          zIndex={1000}
          loaderProps={{ color: "teal", type: "bars", size: "lg" }}
        />
        {getJournalsQuery.isLoading ? (
          <Box style={{ height: 260 }} />
        ) : (
          <Stack>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  flex: 1,
                  minWidth: 280,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <TagsPillsCombo
                  allTags={[
                    { id: -1, name: "Archived", color: "#868e96" },
                    ...allTags,
                  ]}
                  value={filters}
                  onChange={(newFilters) => {
                    setFilters(newFilters);
                    localStorage.setItem(
                      journalsFiltersKey(),
                      JSON.stringify(newFilters),
                    );
                  }}
                  placeholder="Filter to"
                />
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Menu withinPortal={false} position="bottom-end">
                  <Menu.Target>
                    <Button variant="outline" size="sm">
                      {sortBy === "name"
                        ? "Name"
                        : sortBy === "editedAt"
                          ? "Edited"
                          : "Archived"}{" "}
                      {sortDir === "asc" ? "↑" : "↓"}
                    </Button>
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
                        if (sortBy === "editedAt")
                          setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                        else {
                          setSortBy("editedAt");
                          setSortDir("asc");
                        }
                      }}
                    >
                      Edited{" "}
                      {sortBy === "editedAt"
                        ? sortDir === "asc"
                          ? " ↑"
                          : " ↓"
                        : null}
                    </Menu.Item>
                    <Menu.Item
                      onClick={() => {
                        if (sortBy === "archivedAt")
                          setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                        else {
                          setSortBy("archivedAt");
                          setSortDir("asc");
                        }
                      }}
                    >
                      Archived{" "}
                      {sortBy === "archivedAt"
                        ? sortDir === "asc"
                          ? " ↑"
                          : " ↓"
                        : null}
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </div>
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
                    marginBottom: 12,
                  } as React.CSSProperties;

                  return (
                    <div key={r.key} style={cardStyle}>
                      <JournalCard
                        journal={r.journal}
                        tags={r.tags ?? []}
                        onSaved={() => getJournalsQuery.refetch()}
                        onDeleted={() => getJournalsQuery.refetch()}
                      />
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            <Group justify="center" mt="md">
              <Button size="xl" w={rem(300)} onClick={() => openNewJournal()}>
                Add New
              </Button>
            </Group>
            <Group justify="center" mt="sm">
              <Button size="sm" w={rem(200)} onClick={() => openTagsModal()}>
                Manage Journal Tags
              </Button>
            </Group>
            <ManageJournalTagsModal
              modalOpened={tagsModalOpened}
              closeModal={closeTagsModal}
            />
            <NewJournalModal
              modalOpened={newJournalModalOpened}
              closeModal={closeNewJournal}
              onCreated={() => getJournalsQuery.refetch()}
            />
          </Stack>
        )}
      </div>
    </Fragment>
  );
}
