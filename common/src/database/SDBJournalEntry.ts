type SDBJournalEntry = {
  id: number;
  journalId: number;
  title: string | null;
  text: string;
  createDate: string;
  editedDate: string | null;
};

export type { SDBJournalEntry };
