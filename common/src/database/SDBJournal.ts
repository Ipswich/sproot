type SDBJournal = {
  id: number;
  title: string;
  description: string | null;
  archived: boolean;
  icon: string | null;
  color: string | null;
  createdAt: string;
  editedAt: string;
  archivedAt: string | null;
};

export type { SDBJournal };
