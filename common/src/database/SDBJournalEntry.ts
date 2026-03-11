type SDBJournalEntry = {
  id: number;
  journalId: number;
  title: string | null;
  content: string;
  createdAt: string;
  editedAt: string;
};

export type { SDBJournalEntry };
