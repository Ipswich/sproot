import type { IJournalsRepository } from "@sproot/common/database/journals/IJournalsRepository";
import { SDBJournal } from "@sproot/common/database/SDBJournal";
import { SDBJournalEntry } from "@sproot/common/database/SDBJournalEntry";
import { SDBJournalEntryTag } from "@sproot/common/database/SDBJournalEntryTag";
import { SDBJournalEntryTagLookup } from "@sproot/common/database/SDBJournalEntryTagLookup";
import { SDBJournalTag } from "@sproot/common/database/SDBJournalTag";
import { SDBJournalTagLookup } from "@sproot/common/database/SDBJournalTagLookup";
import { Knex } from "knex";
import { dbToIso, isoToDb, toDbDate } from "../../../utils/dateUtils";
import { BaseKnexRepository } from "../utils/BaseKnexRepository";

export class JournalsRepository extends BaseKnexRepository implements IJournalsRepository {
  constructor(connection: Knex) {
    super(connection);
  }

  async getAllAsync(): Promise<SDBJournal[]> {
    return (await this.connection("journals").select("*")).map((journal: SDBJournal) =>
      this.mapJournal(journal),
    );
  }

  async getByIdAsync(id: number): Promise<SDBJournal[]> {
    const results = await this.connection("journals").where("id", id).select("*");
    return (results as SDBJournal[]).map((journal: SDBJournal) => this.mapJournal(journal));
  }

  async addAsync(
    title: string,
    description: string | null,
    icon: string | null,
    color: string | null,
    createdAt?: string | null,
  ): Promise<number> {
    return this.insertAndGetIdAsync("journals", {
      title,
      description,
      archived: false,
      icon,
      color,
      createdAt: createdAt ?? toDbDate(),
      editedAt: createdAt ?? toDbDate(),
      archivedAt: null,
    });
  }

  async updateAsync(journal: SDBJournal): Promise<void> {
    const archivedAt = journal.archived ? (isoToDb(journal.archivedAt) ?? toDbDate()) : null;
    return this.connection("journals")
      .where("id", journal.id)
      .update({
        title: journal.title,
        description: journal.description,
        archived: journal.archived,
        icon: journal.icon,
        color: journal.color,
        editedAt: isoToDb(journal.editedAt),
        archivedAt,
      });
  }

  async deleteAsync(id: number): Promise<void> {
    return this.connection("journals").where("id", id).delete();
  }

  async getJournalTagsAsync(): Promise<SDBJournalTag[]> {
    return this.connection("journal_tags").select("*");
  }

  async addJournalTagAsync(name: string, color: string | null): Promise<number> {
    return this.insertAndGetIdAsync("journal_tags", { name, color });
  }

  async updateJournalTagAsync(tag: SDBJournalTag): Promise<void> {
    return this.connection("journal_tags")
      .where("id", tag.id)
      .update({ name: tag.name, color: tag.color });
  }

  async deleteJournalTagAsync(id: number): Promise<void> {
    return this.connection("journal_tags").where("id", id).delete();
  }

  async getJournalTagLookupsAsync(): Promise<SDBJournalTagLookup[]> {
    return this.connection("journal_tag_lookup").select(
      "id",
      "journal_id as journalId",
      "tag_id as tagId",
    );
  }

  async addJournalTagLookupAsync(journalId: number, tagId: number): Promise<number> {
    return this.insertAndGetIdAsync("journal_tag_lookup", {
      journal_id: journalId,
      tag_id: tagId,
    });
  }

  async deleteJournalTagLookupAsync(journalId: number, tagId: number): Promise<void> {
    return this.connection("journal_tag_lookup")
      .where({ journal_id: journalId, tag_id: tagId })
      .delete();
  }

  async getJournalEntriesAsync(
    journalId: number,
    withContent?: boolean,
  ): Promise<SDBJournalEntry[]> {
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

  async getJournalEntryAsync(entryId: number, withContent?: boolean): Promise<SDBJournalEntry[]> {
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

  async addJournalEntryAsync(
    journalId: number,
    title: string | null,
    content: string,
    createdAt?: string | null,
  ): Promise<number> {
    const journalEntryId = await this.insertAndGetIdAsync("journal_entries", {
      journal_id: journalId,
      title,
      content,
      createdAt: createdAt ?? toDbDate(),
      editedAt: createdAt ?? toDbDate(),
    });
    await this.connection("journals").where("id", journalId).update({
      editedAt: toDbDate(),
    });

    return journalEntryId;
  }

  async updateJournalEntryAsync(entry: SDBJournalEntry): Promise<void> {
    await Promise.all([
      this.connection("journal_entries").where("id", entry.id).update({
        journal_id: entry.journalId,
        title: entry.title,
        content: entry.content,
        editedAt: toDbDate(),
      }),
      this.connection("journals").where("id", entry.journalId).update({
        editedAt: toDbDate(),
      }),
    ]);
  }

  async deleteJournalEntryAsync(id: number): Promise<void> {
    const entry = await this.connection("journal_entries")
      .where("id", id)
      .select("journal_id as journalId")
      .first();
    await Promise.all([
      this.connection("journal_entries").where("id", id).delete(),
      this.connection("journals").where("id", entry?.journalId).update({
        editedAt: toDbDate(),
      }),
    ]);
  }

  async getJournalEntryTagsAsync(): Promise<SDBJournalEntryTag[]> {
    return this.connection("journal_entry_tags").select("*");
  }

  async addJournalEntryTagAsync(name: string, color: string | null): Promise<number> {
    return this.insertAndGetIdAsync("journal_entry_tags", { name, color });
  }

  async updateJournalEntryTagAsync(tag: SDBJournalEntryTag): Promise<void> {
    return this.connection("journal_entry_tags")
      .where("id", tag.id)
      .update({ name: tag.name, color: tag.color });
  }

  async deleteJournalEntryTagAsync(id: number): Promise<void> {
    return this.connection("journal_entry_tags").where("id", id).delete();
  }

  async getJournalEntryTagLookupsAsync(): Promise<SDBJournalEntryTagLookup[]> {
    return this.connection("journal_entry_tag_lookup").select(
      "id",
      "journal_entry_id as journalEntryId",
      "tag_id as tagId",
    );
  }

  async addJournalEntryTagLookupAsync(journalEntryId: number, tagId: number): Promise<number> {
    return this.insertAndGetIdAsync("journal_entry_tag_lookup", {
      journal_entry_id: journalEntryId,
      tag_id: tagId,
    });
  }

  async deleteJournalEntryTagLookupAsync(journalEntryId: number, tagId: number): Promise<void> {
    return this.connection("journal_entry_tag_lookup")
      .where({ journal_entry_id: journalEntryId, tag_id: tagId })
      .delete();
  }

  private mapJournal(journal: SDBJournal): SDBJournal {
    return {
      id: journal.id,
      title: journal.title,
      description: journal.description,
      archived: journal.archived,
      icon: journal.icon,
      color: journal.color,
      createdAt: dbToIso(journal.createdAt)!,
      editedAt: dbToIso(journal.editedAt)!,
      archivedAt: dbToIso(journal.archivedAt),
    };
  }

  private mapJournalEntry(entry: SDBJournalEntry): SDBJournalEntry {
    return {
      ...entry,
      createdAt: dbToIso(entry.createdAt)!,
      editedAt: dbToIso(entry.editedAt)!,
    };
  }
}
