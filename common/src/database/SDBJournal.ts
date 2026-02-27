type SDBJournal = {
  id: number;
  name: string;
  description: string | null;
  archived: boolean;
  icon: string | null;
  color: string | null;
  startDate: string;
  editedDate: string | null;
  archivedDate: string | null;
};

export type { SDBJournal };
