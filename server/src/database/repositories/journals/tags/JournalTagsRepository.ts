import type { IJournalTagsRepository } from "./IJournalTagsRepository";
import { SDBJournalTag } from "@sproot/common/database/SDBJournalTag";
import { SDBJournalTagLookup } from "@sproot/common/database/SDBJournalTagLookup";
import { BaseKnexRepository } from "../../utils/BaseKnexRepository";

export class JournalTagsRepository extends BaseKnexRepository implements IJournalTagsRepository {
  async getTagsAsync(): Promise<SDBJournalTag[]> {
    return this.connection("journal_tags").select("*");
  }

  async addTagAsync(name: string, color: string | null): Promise<number> {
    return this.insertAndGetIdAsync("journal_tags", { name, color });
  }

  async updateTagAsync(tag: SDBJournalTag): Promise<void> {
    return this.connection("journal_tags")
      .where("id", tag.id)
      .update({ name: tag.name, color: tag.color });
  }

  async deleteTagAsync(id: number): Promise<void> {
    return this.connection("journal_tags").where("id", id).delete();
  }

  async getLookupsAsync(): Promise<SDBJournalTagLookup[]> {
    return this.connection("journal_tag_lookup").select(
      "id",
      "journal_id as journalId",
      "tag_id as tagId",
    );
  }

  async addLookupAsync(journalId: number, tagId: number): Promise<number> {
    return this.insertAndGetIdAsync("journal_tag_lookup", { journal_id: journalId, tag_id: tagId });
  }

  async deleteLookupAsync(journalId: number, tagId: number): Promise<void> {
    return this.connection("journal_tag_lookup")
      .where({ journal_id: journalId, tag_id: tagId })
      .delete();
  }
}
