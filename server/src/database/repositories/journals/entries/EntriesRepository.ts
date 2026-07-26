import type { IEntriesRepository } from "@sproot/common/database/journals/entries/IEntriesRepository";
import { SDBJournalEntry } from "@sproot/common/database/SDBJournalEntry";
import { Knex } from "knex";
import { dbToIso, toDbDate } from "../../../../utils/dateUtils";
import { BaseKnexRepository } from "../../utils/BaseKnexRepository";
import type { IEntryTagsRepository } from "@sproot/common/database/journals/tags/IEntryTagsRepository";
import { EntryTagsRepository } from "../tags/EntryTagsRepository";

export class EntriesRepository extends BaseKnexRepository implements IEntriesRepository {
  tags: IEntryTagsRepository;

  constructor(connection: Knex) {
    super(connection);
    this.tags = new EntryTagsRepository(connection);
  }

  async getEntriesAsync(journalId: number, withContent?: boolean): Promise<SDBJournalEntry[]> {
    let results: SDBJournalEntry[] = [];
    if (!withContent) {
      results = await this.connection("journal_entries")
        .where("journal_id", journalId)
        .select("id", "journal_id as journalId", "title", "createdAt", "editedAt");
    } else {
      results = await this.connection("journal_entries")
        .where("journal_id", journalId)
        .select("id", "journal_id as journalId", "title", "content", "createdAt", "editedAt");
    }
    return results.map((entry: SDBJournalEntry) => this.mapJournalEntry(entry));
  }

  async getEntryAsync(entryId: number, withContent?: boolean): Promise<SDBJournalEntry[]> {
    let results: SDBJournalEntry[] = [];
    if (!withContent) {
      results = await this.connection("journal_entries")
        .where("id", entryId)
        .select("id", "journal_id as journalId", "title", "createdAt", "editedAt");
    } else {
      results = await this.connection("journal_entries")
        .where("id", entryId)
        .select("id", "journal_id as journalId", "title", "content", "createdAt", "editedAt");
    }
    return results.map((entry: SDBJournalEntry) => this.mapJournalEntry(entry));
  }

  async addEntryAsync(
    journalId: number,
    name: string | null,
    text: string,
    createdAt?: string | null,
  ): Promise<number> {
    const journalEntryId = await this.insertAndGetIdAsync("journal_entries", {
      journal_id: journalId,
      title: name,
      content: text,
      createdAt: createdAt ?? toDbDate(),
      editedAt: createdAt ?? toDbDate(),
    });
    await this.connection("journals").where("id", journalId).update({ editedAt: toDbDate() });
    return journalEntryId;
  }

  async updateEntryAsync(entry: SDBJournalEntry): Promise<void> {
    await Promise.all([
      this.connection("journal_entries").where("id", entry.id).update({
        journal_id: entry.journalId,
        title: entry.title,
        content: entry.content,
        editedAt: toDbDate(),
      }),
      this.connection("journals").where("id", entry.journalId).update({ editedAt: toDbDate() }),
    ]);
  }

  async deleteEntryAsync(id: number): Promise<void> {
    const entry = await this.connection("journal_entries")
      .where("id", id)
      .select("journal_id as journalId")
      .first();
    await Promise.all([
      this.connection("journal_entries").where("id", id).delete(),
      this.connection("journals").where("id", entry?.journalId).update({ editedAt: toDbDate() }),
    ]);
  }

  private mapJournalEntry(entry: SDBJournalEntry): SDBJournalEntry {
    return {
      ...entry,
      createdAt: dbToIso(entry.createdAt)!,
      editedAt: dbToIso(entry.editedAt)!,
    };
  }
}
