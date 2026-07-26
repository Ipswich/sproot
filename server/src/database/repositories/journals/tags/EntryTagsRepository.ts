import type { IEntryTagsRepository } from "@sproot/common/database/journals/tags/IEntryTagsRepository";
import { SDBJournalEntryTag } from "@sproot/common/database/SDBJournalEntryTag";
import { SDBJournalEntryTagLookup } from "@sproot/common/database/SDBJournalEntryTagLookup";
import { BaseKnexRepository } from "../../utils/BaseKnexRepository";

export class EntryTagsRepository extends BaseKnexRepository implements IEntryTagsRepository {
  async getTagsAsync(): Promise<SDBJournalEntryTag[]> {
    return this.connection("journal_entry_tags").select("*");
  }

  async addTagAsync(name: string, color: string | null): Promise<number> {
    return this.insertAndGetIdAsync("journal_entry_tags", { name, color });
  }

  async updateTagAsync(tag: SDBJournalEntryTag): Promise<void> {
    return this.connection("journal_entry_tags")
      .where("id", tag.id)
      .update({ name: tag.name, color: tag.color });
  }

  async deleteTagAsync(id: number): Promise<void> {
    return this.connection("journal_entry_tags").where("id", id).delete();
  }

  async getLookupsAsync(): Promise<SDBJournalEntryTagLookup[]> {
    return this.connection("journal_entry_tag_lookup").select(
      "id",
      "journal_entry_id as journalEntryId",
      "tag_id as tagId",
    );
  }

  async addLookupAsync(journalEntryId: number, tagId: number): Promise<number> {
    return this.insertAndGetIdAsync("journal_entry_tag_lookup", {
      journal_entry_id: journalEntryId,
      tag_id: tagId,
    });
  }

  async deleteLookupAsync(journalEntryId: number, tagId: number): Promise<void> {
    return this.connection("journal_entry_tag_lookup")
      .where({ journal_entry_id: journalEntryId, tag_id: tagId })
      .delete();
  }
}
