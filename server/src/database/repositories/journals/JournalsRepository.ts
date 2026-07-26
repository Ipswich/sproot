import type { IJournalRepository } from "@sproot/common/database/journals/IJournalRepository";
import { SDBJournal } from "@sproot/common/database/SDBJournal";
import { Knex } from "knex";
import { dbToIso, isoToDb, toDbDate } from "../../../utils/dateUtils";
import { BaseKnexRepository } from "../utils/BaseKnexRepository";
import type { IEntriesRepository } from "@sproot/common/database/journals/entries/IEntriesRepository";
import type { IJournalTagsRepository } from "@sproot/common/database/journals/tags/IJournalTagsRepository";
import { EntriesRepository } from "./entries/EntriesRepository";
import { JournalTagsRepository } from "./tags/JournalTagsRepository";

export class JournalsRepository extends BaseKnexRepository implements IJournalRepository {
  entries: IEntriesRepository;
  tags: IJournalTagsRepository;

  constructor(connection: Knex) {
    super(connection);
    this.entries = new EntriesRepository(connection);
    this.tags = new JournalTagsRepository(connection);
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
    startDate?: string | null,
  ): Promise<number> {
    return this.insertAndGetIdAsync("journals", {
      title,
      description,
      archived: false,
      icon,
      color,
      createdAt: startDate ?? toDbDate(),
      editedAt: startDate ?? toDbDate(),
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
}
