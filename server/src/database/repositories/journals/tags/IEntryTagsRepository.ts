import { SDBJournalEntryTag } from "@sproot/common/database/SDBJournalEntryTag";
import { SDBJournalEntryTagLookup } from "@sproot/common/database/SDBJournalEntryTagLookup";

export interface IEntryTagsRepository {
  getTagsAsync(): Promise<SDBJournalEntryTag[]>;
  addTagAsync(name: string, color: string | null): Promise<number>;
  updateTagAsync(tag: SDBJournalEntryTag): Promise<void>;
  deleteTagAsync(id: number): Promise<void>;
  getLookupsAsync(): Promise<SDBJournalEntryTagLookup[]>;
  addLookupAsync(journalEntryId: number, tagId: number): Promise<number>;
  deleteLookupAsync(journalEntryId: number, tagId: number): Promise<void>;
}
