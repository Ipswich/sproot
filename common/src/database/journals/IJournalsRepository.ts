/* eslint-disable @typescript-eslint/no-unused-vars */
import { SDBJournal } from "@sproot/common/src/database/SDBJournal";
import { SDBJournalEntry } from "@sproot/common/src/database/SDBJournalEntry";
import { SDBJournalEntryTag } from "@sproot/common/src/database/SDBJournalEntryTag";
import { SDBJournalEntryTagLookup } from "@sproot/common/src/database/SDBJournalEntryTagLookup";
import { SDBJournalTag } from "@sproot/common/src/database/SDBJournalTag";
import { SDBJournalTagLookup } from "@sproot/common/src/database/SDBJournalTagLookup";

export interface IJournalsRepository {
  getAllAsync(): Promise<SDBJournal[]>;
  getByIdAsync(id: number): Promise<SDBJournal[]>;
  addAsync(
    name: string,
    description: string | null,
    icon: string | null,
    color: string | null,
    startDate?: string | null,
  ): Promise<number>;
  updateAsync(journal: SDBJournal): Promise<void>;
  deleteAsync(id: number): Promise<void>;

  getJournalTagsAsync(): Promise<SDBJournalTag[]>;
  addJournalTagAsync(name: string, color: string | null): Promise<number>;
  updateJournalTagAsync(tag: SDBJournalTag): Promise<void>;
  deleteJournalTagAsync(id: number): Promise<void>;

  getJournalTagLookupsAsync(): Promise<SDBJournalTagLookup[]>;
  addJournalTagLookupAsync(journalId: number, tagId: number): Promise<number>;
  deleteJournalTagLookupAsync(journalId: number, tagId: number): Promise<void>;

  getJournalEntriesAsync(journalId: number, withContent?: boolean): Promise<SDBJournalEntry[]>;
  getJournalEntryAsync(entryId: number, withContent?: boolean): Promise<SDBJournalEntry[]>;
  addJournalEntryAsync(
    journalId: number,
    name: string | null,
    text: string,
    createdAt?: string | null,
  ): Promise<number>;
  updateJournalEntryAsync(entry: SDBJournalEntry): Promise<void>;
  deleteJournalEntryAsync(id: number): Promise<void>;

  getJournalEntryTagsAsync(): Promise<SDBJournalEntryTag[]>;
  addJournalEntryTagAsync(name: string, color: string | null): Promise<number>;
  updateJournalEntryTagAsync(tag: SDBJournalEntryTag): Promise<void>;
  deleteJournalEntryTagAsync(id: number): Promise<void>;

  getJournalEntryTagLookupsAsync(): Promise<SDBJournalEntryTagLookup[]>;
  addJournalEntryTagLookupAsync(journalEntryId: number, tagId: number): Promise<number>;
  deleteJournalEntryTagLookupAsync(journalEntryId: number, tagId: number): Promise<void>;
}
