type SDBJournalEntry = {
  id: number;
  journalId: number;
  name: string | null;
  text: string;
  createDate: string;
  editedDate: string | null;
};

export type { SDBJournalEntry };
