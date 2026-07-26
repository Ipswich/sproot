/* eslint-disable @typescript-eslint/no-unused-vars */
import { SDBJournalEntry } from "@sproot/common/src/database/SDBJournalEntry";
import { IEntryTagsRepository } from "../tags/IEntryTagsRepository";

export interface IEntriesRepository {
  getEntriesAsync(journalId: number, withContent?: boolean): Promise<SDBJournalEntry[]>;
  getEntryAsync(entryId: number, withContent?: boolean): Promise<SDBJournalEntry[]>;
  addEntryAsync(
    journalId: number,
    name: string | null,
    text: string,
    createdAt?: string | null,
  ): Promise<number>;
  updateEntryAsync(entry: SDBJournalEntry): Promise<void>;
  deleteEntryAsync(id: number): Promise<void>;

  tags: IEntryTagsRepository;
}
