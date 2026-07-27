import { SDBJournalTag } from "@sproot/common/database/SDBJournalTag";
import { SDBJournalTagLookup } from "@sproot/common/database/SDBJournalTagLookup";

export interface IJournalTagsRepository {
  getTagsAsync(): Promise<SDBJournalTag[]>;
  addTagAsync(name: string, color: string | null): Promise<number>;
  updateTagAsync(tag: SDBJournalTag): Promise<void>;
  deleteTagAsync(id: number): Promise<void>;
  getLookupsAsync(): Promise<SDBJournalTagLookup[]>;
  addLookupAsync(journalId: number, tagId: number): Promise<number>;
  deleteLookupAsync(journalId: number, tagId: number): Promise<void>;
}
