type SDBJournalEntryDeviceData = {
  id: number;
  journalEntryId: number;
  deviceName: string;
  reading: number;
  units: string | null;
  readingTime: string;
};

export type { SDBJournalEntryDeviceData };
