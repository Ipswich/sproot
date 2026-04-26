type SDBJournalEntry = {
  id: number;
  journalId: number;
  title: string | null;
  content: string | undefined;
  createdAt: string;
  editedAt: string;
};

export type { SDBJournalEntry };
